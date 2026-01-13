// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VeriChainCredentialV2
 * @dev Enhanced Soulbound credential NFTs with batch operations, expiration, and role-based access
 * @notice Production-ready implementation with comprehensive security features
 * @author VeriChain Team
 */
contract VeriChainCredentialV2 is ERC721, ERC721URIStorage, AccessControl, Pausable, ReentrancyGuard {
    // ============ Constants ============
    
    /// @dev Role for contract administrators
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @dev Role for authorized credential issuers
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    
    /// @dev Maximum credentials per batch operation
    uint256 public constant MAX_BATCH_SIZE = 50;
    
    /// @dev Maximum URI length to prevent gas issues
    uint256 public constant MAX_URI_LENGTH = 500;

    // ============ State Variables ============
    
    /// @dev Counter for generating unique token IDs
    uint256 private _nextTokenId;
    
    /// @dev Mapping of revoked credentials (tokenId => isRevoked)
    mapping(uint256 => bool) public revokedCredentials;
    
    /// @dev Mapping of token to issuing institution
    mapping(uint256 => address) public credentialIssuer;
    
    /// @dev Mapping of token to issue timestamp
    mapping(uint256 => uint256) public issueTimestamp;
    
    /// @dev Mapping of token to expiration timestamp (0 = never expires)
    mapping(uint256 => uint256) public expirationTimestamp;
    
    /// @dev Mapping of credential type hash to credential count
    mapping(bytes32 => uint256) public credentialTypeCount;
    
    /// @dev Institution metadata (address => metadata URI)
    mapping(address => string) public institutionMetadata;
    
    /// @dev Revocation reason for auditing
    mapping(uint256 => string) public revocationReason;

    // ============ Structs ============
    
    /// @dev Credential issuance parameters
    struct CredentialParams {
        address recipient;
        string uri;
        uint256 expiresAt;
        bytes32 credentialType;
    }
    
    /// @dev Detailed credential information
    struct CredentialInfo {
        uint256 tokenId;
        address holder;
        address issuer;
        string uri;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isRevoked;
        bool isExpired;
        bool isValid;
        string revocationReason;
    }

    // ============ Events ============
    
    event InstitutionRegistered(
        address indexed institution, 
        string metadataUri, 
        uint256 timestamp
    );
    
    event InstitutionUpdated(
        address indexed institution, 
        string metadataUri, 
        uint256 timestamp
    );
    
    event InstitutionRevoked(
        address indexed institution, 
        address indexed revokedBy,
        uint256 timestamp
    );
    
    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed recipient,
        address indexed issuer,
        string tokenURI,
        uint256 expiresAt,
        bytes32 credentialType,
        uint256 timestamp
    );
    
    event CredentialRevoked(
        uint256 indexed tokenId,
        address indexed revokedBy,
        string reason,
        uint256 timestamp
    );
    
    event CredentialRenewed(
        uint256 indexed tokenId,
        uint256 oldExpiration,
        uint256 newExpiration,
        uint256 timestamp
    );
    
    event BatchCredentialsIssued(
        address indexed issuer,
        uint256[] tokenIds,
        uint256 count,
        uint256 timestamp
    );
    
    event ContractPaused(address indexed by, uint256 timestamp);
    event ContractUnpaused(address indexed by, uint256 timestamp);

    // ============ Errors ============
    
    error NotAuthorizedIssuer();
    error CredentialAlreadyRevoked();
    error SoulboundTokenNonTransferable();
    error CredentialNotFound();
    error OnlyIssuerOrAdminCanRevoke();
    error InvalidRecipient();
    error InvalidURI();
    error URITooLong();
    error ExpirationInPast();
    error BatchSizeExceeded();
    error BatchSizeMismatch();
    error CredentialExpired();
    error CredentialNotExpired();
    error ArrayLengthMismatch();
    error ZeroAddress();

    // ============ Constructor ============
    
    constructor() ERC721("VeriChain Credential", "VERI") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    // ============ Modifiers ============
    
    /// @dev Validates recipient address
    modifier validRecipient(address recipient) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (recipient == address(this)) revert InvalidRecipient();
        _;
    }
    
    /// @dev Validates URI
    modifier validURI(string memory uri) {
        if (bytes(uri).length == 0) revert InvalidURI();
        if (bytes(uri).length > MAX_URI_LENGTH) revert URITooLong();
        _;
    }

    // ============ Institution Management ============
    
    /**
     * @dev Registers a new institution with metadata
     * @param institution Address of the institution
     * @param metadataUri IPFS URI for institution details
     */
    function registerInstitution(
        address institution, 
        string calldata metadataUri
    ) external onlyRole(ADMIN_ROLE) {
        if (institution == address(0)) revert ZeroAddress();
        
        _grantRole(ISSUER_ROLE, institution);
        institutionMetadata[institution] = metadataUri;
        
        emit InstitutionRegistered(institution, metadataUri, block.timestamp);
    }
    
    /**
     * @dev Updates institution metadata
     * @param institution Address of the institution
     * @param metadataUri New IPFS URI for institution details
     */
    function updateInstitutionMetadata(
        address institution, 
        string calldata metadataUri
    ) external onlyRole(ADMIN_ROLE) {
        institutionMetadata[institution] = metadataUri;
        emit InstitutionUpdated(institution, metadataUri, block.timestamp);
    }
    
    /**
     * @dev Revokes an institution's issuing rights
     * @param institution Address of the institution
     */
    function revokeInstitution(address institution) external onlyRole(ADMIN_ROLE) {
        _revokeRole(ISSUER_ROLE, institution);
        emit InstitutionRevoked(institution, msg.sender, block.timestamp);
    }

    // ============ Single Credential Issuance ============
    
    /**
     * @dev Issues a credential with optional expiration
     * @param recipient Address of the recipient
     * @param uri IPFS metadata URI
     * @param expiresAt Expiration timestamp (0 for never)
     * @param credentialType Type identifier for categorization
     */
    function issueCredential(
        address recipient,
        string calldata uri,
        uint256 expiresAt,
        bytes32 credentialType
    ) external 
        onlyRole(ISSUER_ROLE) 
        whenNotPaused 
        nonReentrant
        validRecipient(recipient)
        validURI(uri)
        returns (uint256) 
    {
        if (expiresAt != 0 && expiresAt <= block.timestamp) {
            revert ExpirationInPast();
        }
        
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, uri);
        
        credentialIssuer[tokenId] = msg.sender;
        issueTimestamp[tokenId] = block.timestamp;
        expirationTimestamp[tokenId] = expiresAt;
        credentialTypeCount[credentialType]++;
        
        emit CredentialIssued(
            tokenId, 
            recipient, 
            msg.sender, 
            uri, 
            expiresAt, 
            credentialType, 
            block.timestamp
        );
        
        return tokenId;
    }
    
    /**
     * @dev Simple issuance without expiration (backwards compatible)
     */
    function issueCredential(
        address recipient,
        string calldata uri
    ) external 
        onlyRole(ISSUER_ROLE) 
        whenNotPaused 
        nonReentrant
        validRecipient(recipient)
        validURI(uri)
        returns (uint256) 
    {
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, uri);
        
        credentialIssuer[tokenId] = msg.sender;
        issueTimestamp[tokenId] = block.timestamp;
        
        emit CredentialIssued(
            tokenId, 
            recipient, 
            msg.sender, 
            uri, 
            0, 
            bytes32(0), 
            block.timestamp
        );
        
        return tokenId;
    }

    // ============ Batch Operations ============
    
    /**
     * @dev Issues multiple credentials in a single transaction
     * @param params Array of credential parameters
     * @return tokenIds Array of minted token IDs
     */
    function batchIssueCredentials(
        CredentialParams[] calldata params
    ) external 
        onlyRole(ISSUER_ROLE) 
        whenNotPaused 
        nonReentrant
        returns (uint256[] memory tokenIds) 
    {
        uint256 length = params.length;
        if (length == 0 || length > MAX_BATCH_SIZE) {
            revert BatchSizeExceeded();
        }
        
        tokenIds = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            CredentialParams calldata p = params[i];
            
            if (p.recipient == address(0) || p.recipient == address(this)) {
                revert InvalidRecipient();
            }
            if (bytes(p.uri).length == 0 || bytes(p.uri).length > MAX_URI_LENGTH) {
                revert InvalidURI();
            }
            if (p.expiresAt != 0 && p.expiresAt <= block.timestamp) {
                revert ExpirationInPast();
            }
            
            uint256 tokenId = _nextTokenId++;
            tokenIds[i] = tokenId;
            
            _safeMint(p.recipient, tokenId);
            _setTokenURI(tokenId, p.uri);
            
            credentialIssuer[tokenId] = msg.sender;
            issueTimestamp[tokenId] = block.timestamp;
            expirationTimestamp[tokenId] = p.expiresAt;
            
            if (p.credentialType != bytes32(0)) {
                credentialTypeCount[p.credentialType]++;
            }
            
            emit CredentialIssued(
                tokenId, 
                p.recipient, 
                msg.sender, 
                p.uri, 
                p.expiresAt, 
                p.credentialType, 
                block.timestamp
            );
        }
        
        emit BatchCredentialsIssued(msg.sender, tokenIds, length, block.timestamp);
        
        return tokenIds;
    }

    // ============ Credential Revocation ============
    
    /**
     * @dev Revokes a credential with reason
     * @param tokenId ID of the credential
     * @param reason Reason for revocation (for auditing)
     */
    function revokeCredential(
        uint256 tokenId, 
        string calldata reason
    ) external whenNotPaused {
        address holder = _ownerOf(tokenId);
        if (holder == address(0)) revert CredentialNotFound();
        if (revokedCredentials[tokenId]) revert CredentialAlreadyRevoked();
        
        bool isIssuer = msg.sender == credentialIssuer[tokenId];
        bool isAdmin = hasRole(ADMIN_ROLE, msg.sender);
        
        if (!isIssuer && !isAdmin) {
            revert OnlyIssuerOrAdminCanRevoke();
        }
        
        revokedCredentials[tokenId] = true;
        revocationReason[tokenId] = reason;
        
        emit CredentialRevoked(tokenId, msg.sender, reason, block.timestamp);
    }
    
    /**
     * @dev Batch revoke credentials
     * @param tokenIds Array of token IDs to revoke
     * @param reason Common reason for all revocations
     */
    function batchRevokeCredentials(
        uint256[] calldata tokenIds,
        string calldata reason
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        if (tokenIds.length > MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            if (_ownerOf(tokenId) != address(0) && !revokedCredentials[tokenId]) {
                revokedCredentials[tokenId] = true;
                revocationReason[tokenId] = reason;
                emit CredentialRevoked(tokenId, msg.sender, reason, block.timestamp);
            }
        }
    }

    // ============ Credential Renewal ============
    
    /**
     * @dev Extends credential expiration
     * @param tokenId ID of the credential
     * @param newExpiresAt New expiration timestamp
     */
    function renewCredential(
        uint256 tokenId,
        uint256 newExpiresAt
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        if (_ownerOf(tokenId) == address(0)) revert CredentialNotFound();
        if (revokedCredentials[tokenId]) revert CredentialAlreadyRevoked();
        if (newExpiresAt != 0 && newExpiresAt <= block.timestamp) {
            revert ExpirationInPast();
        }
        
        // Only original issuer or admin can renew
        bool isIssuer = msg.sender == credentialIssuer[tokenId];
        bool isAdmin = hasRole(ADMIN_ROLE, msg.sender);
        if (!isIssuer && !isAdmin) revert OnlyIssuerOrAdminCanRevoke();
        
        uint256 oldExpiration = expirationTimestamp[tokenId];
        expirationTimestamp[tokenId] = newExpiresAt;
        
        emit CredentialRenewed(tokenId, oldExpiration, newExpiresAt, block.timestamp);
    }

    // ============ Verification Functions ============
    
    /**
     * @dev Comprehensive credential verification
     * @param tokenId ID of the credential
     * @return info Complete credential information
     */
    function getCredentialInfo(uint256 tokenId) external view returns (CredentialInfo memory info) {
        address holder = _ownerOf(tokenId);
        
        info.tokenId = tokenId;
        info.holder = holder;
        
        if (holder == address(0)) {
            return info;
        }
        
        info.issuer = credentialIssuer[tokenId];
        info.uri = tokenURI(tokenId);
        info.issuedAt = issueTimestamp[tokenId];
        info.expiresAt = expirationTimestamp[tokenId];
        info.isRevoked = revokedCredentials[tokenId];
        info.revocationReason = revocationReason[tokenId];
        
        // Check expiration
        info.isExpired = info.expiresAt != 0 && block.timestamp > info.expiresAt;
        
        // Valid if not revoked, not expired, and issuer is still authorized
        info.isValid = !info.isRevoked && 
                       !info.isExpired && 
                       hasRole(ISSUER_ROLE, info.issuer);
        
        return info;
    }
    
    /**
     * @dev Simple validity check
     */
    function isCredentialValid(uint256 tokenId) external view returns (bool) {
        address holder = _ownerOf(tokenId);
        if (holder == address(0)) return false;
        if (revokedCredentials[tokenId]) return false;
        
        uint256 expires = expirationTimestamp[tokenId];
        if (expires != 0 && block.timestamp > expires) return false;
        
        return hasRole(ISSUER_ROLE, credentialIssuer[tokenId]);
    }
    
    /**
     * @dev Legacy verification (backwards compatible)
     */
    function verifyCredential(uint256 tokenId) external view returns (
        bool isValid,
        address issuer,
        address holder,
        uint256 issuedAt
    ) {
        holder = _ownerOf(tokenId);
        if (holder == address(0)) {
            return (false, address(0), address(0), 0);
        }
        
        issuer = credentialIssuer[tokenId];
        issuedAt = issueTimestamp[tokenId];
        
        bool isRevoked = revokedCredentials[tokenId];
        uint256 expires = expirationTimestamp[tokenId];
        bool isExpired = expires != 0 && block.timestamp > expires;
        
        isValid = !isRevoked && !isExpired && hasRole(ISSUER_ROLE, issuer);
        
        return (isValid, issuer, holder, issuedAt);
    }
    
    /**
     * @dev Gets all credential IDs owned by an address
     */
    function getCredentialsByHolder(address holder) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(holder);
        uint256[] memory tokenIds = new uint256[](balance);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _nextTokenId && index < balance; i++) {
            if (_ownerOf(i) == holder) {
                tokenIds[index] = i;
                index++;
            }
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Gets credentials issued by an institution
     */
    function getCredentialsByIssuer(address issuer) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First pass: count
        for (uint256 i = 0; i < _nextTokenId; i++) {
            if (credentialIssuer[i] == issuer) count++;
        }
        
        // Second pass: collect
        uint256[] memory tokenIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < _nextTokenId; i++) {
            if (credentialIssuer[i] == issuer) {
                tokenIds[index] = i;
                index++;
            }
        }
        
        return tokenIds;
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Pauses all credential operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit ContractPaused(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Unpauses credential operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender, block.timestamp);
    }

    // ============ Soulbound Implementation ============
    
    /**
     * @dev Override to block all transfers
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        if (from != address(0) && to != address(0)) {
            revert SoulboundTokenNonTransferable();
        }
        
        return super._update(to, tokenId, auth);
    }
    
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert SoulboundTokenNonTransferable();
    }
    
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert SoulboundTokenNonTransferable();
    }

    // ============ Required Overrides ============
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
    
    /**
     * @dev Returns contract version for upgrades
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
