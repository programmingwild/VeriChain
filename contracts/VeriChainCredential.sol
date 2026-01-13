// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeriChainCredential
 * @dev Soulbound (non-transferable) credential NFTs issued by authorized institutions
 * @notice This contract implements ERC-721 with all transfers disabled
 */
contract VeriChainCredential is ERC721, ERC721URIStorage, Ownable {
    // ============ State Variables ============
    
    /// @dev Counter for generating unique token IDs
    uint256 private _nextTokenId;
    
    /// @dev Mapping of authorized institution addresses
    mapping(address => bool) public authorizedInstitutions;
    
    /// @dev Mapping of revoked credentials (tokenId => isRevoked)
    mapping(uint256 => bool) public revokedCredentials;
    
    /// @dev Mapping of token to issuing institution
    mapping(uint256 => address) public credentialIssuer;
    
    /// @dev Mapping of token to issue timestamp
    mapping(uint256 => uint256) public issueTimestamp;

    // ============ Events ============
    
    /// @dev Emitted when an institution is authorized
    event InstitutionAuthorized(address indexed institution, uint256 timestamp);
    
    /// @dev Emitted when an institution authorization is revoked
    event InstitutionRevoked(address indexed institution, uint256 timestamp);
    
    /// @dev Emitted when a credential is issued
    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed recipient,
        address indexed issuer,
        string tokenURI,
        uint256 timestamp
    );
    
    /// @dev Emitted when a credential is revoked
    event CredentialRevoked(
        uint256 indexed tokenId,
        address indexed revokedBy,
        uint256 timestamp
    );

    // ============ Errors ============
    
    error NotAuthorizedInstitution();
    error CredentialAlreadyRevoked();
    error SoulboundTokenNonTransferable();
    error CredentialNotFound();
    error OnlyIssuerCanRevoke();

    // ============ Constructor ============
    
    constructor() ERC721("VeriChain Credential", "VERI") Ownable(msg.sender) {}

    // ============ Modifiers ============
    
    /// @dev Ensures caller is an authorized institution
    modifier onlyAuthorizedInstitution() {
        if (!authorizedInstitutions[msg.sender]) {
            revert NotAuthorizedInstitution();
        }
        _;
    }

    // ============ Institution Management ============
    
    /**
     * @dev Authorizes an institution to issue credentials
     * @param institution Address of the institution wallet
     */
    function authorizeInstitution(address institution) external onlyOwner {
        authorizedInstitutions[institution] = true;
        emit InstitutionAuthorized(institution, block.timestamp);
    }
    
    /**
     * @dev Revokes an institution's authorization
     * @param institution Address of the institution wallet
     */
    function revokeInstitution(address institution) external onlyOwner {
        authorizedInstitutions[institution] = false;
        emit InstitutionRevoked(institution, block.timestamp);
    }

    // ============ Credential Issuance ============
    
    /**
     * @dev Issues a new soulbound credential to a recipient
     * @param recipient Address of the credential recipient
     * @param uri IPFS URI containing credential metadata
     * @return tokenId The ID of the newly minted credential
     */
    function issueCredential(
        address recipient,
        string memory uri
    ) external onlyAuthorizedInstitution returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, uri);
        
        credentialIssuer[tokenId] = msg.sender;
        issueTimestamp[tokenId] = block.timestamp;
        
        emit CredentialIssued(tokenId, recipient, msg.sender, uri, block.timestamp);
        
        return tokenId;
    }

    // ============ Credential Revocation ============
    
    /**
     * @dev Revokes a credential (only by original issuer or contract owner)
     * @param tokenId ID of the credential to revoke
     */
    function revokeCredential(uint256 tokenId) external {
        if (_ownerOf(tokenId) == address(0)) {
            revert CredentialNotFound();
        }
        if (revokedCredentials[tokenId]) {
            revert CredentialAlreadyRevoked();
        }
        // Only the original issuer or contract owner can revoke
        if (msg.sender != credentialIssuer[tokenId] && msg.sender != owner()) {
            revert OnlyIssuerCanRevoke();
        }
        
        revokedCredentials[tokenId] = true;
        emit CredentialRevoked(tokenId, msg.sender, block.timestamp);
    }

    // ============ Verification Functions ============
    
    /**
     * @dev Verifies if an institution is authorized
     * @param institution Address to verify
     * @return bool True if authorized
     */
    function isAuthorizedInstitution(address institution) external view returns (bool) {
        return authorizedInstitutions[institution];
    }
    
    /**
     * @dev Verifies if a credential is valid (exists and not revoked)
     * @param tokenId ID of the credential
     * @return isValid True if credential exists and is not revoked
     * @return issuer Address of the issuing institution
     * @return holder Current holder of the credential
     * @return issuedAt Timestamp when credential was issued
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
        isValid = !revokedCredentials[tokenId] && authorizedInstitutions[issuer];
        
        return (isValid, issuer, holder, issuedAt);
    }
    
    /**
     * @dev Gets all credential IDs owned by an address
     * @param holder Address to query
     * @return tokenIds Array of token IDs owned by the holder
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

    // ============ Soulbound Implementation (Transfer Blocking) ============
    
    /**
     * @dev Override to block all transfers - makes tokens soulbound
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but block all transfers
        if (from != address(0) && to != address(0)) {
            revert SoulboundTokenNonTransferable();
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Explicitly disable approve to reinforce soulbound nature
     */
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert SoulboundTokenNonTransferable();
    }
    
    /**
     * @dev Explicitly disable setApprovalForAll to reinforce soulbound nature
     */
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert SoulboundTokenNonTransferable();
    }

    // ============ Required Overrides ============
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Returns the total number of credentials issued
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}
