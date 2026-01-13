// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeriChainCredentialHybrid
 * @notice Soulbound NFT credential system with optional encrypted private data
 * @dev Combines public verifiable credentials with Inco FHE encrypted metadata
 * 
 * This contract supports two modes:
 * 1. Standard credentials (fully public) - for transparency
 * 2. Hybrid credentials (public + encrypted private data) - for privacy
 * 
 * Public Data (always visible):
 * - Issuer address
 * - Issue date
 * - Credential type
 * - IPFS metadata URI
 * - Achievement name & description
 * 
 * Private Data (encrypted with Inco FHE):
 * - Student ID handle
 * - Grade handle
 * - Personal data handle
 * 
 * The encrypted handles can only be decrypted by authorized viewers
 * using Inco's re-encryption mechanism.
 */
contract VeriChainCredentialHybrid is ERC721, ERC721URIStorage, Ownable {

    // ============ State Variables ============

    uint256 private _tokenIdCounter;

    // Authorized institutions
    mapping(address => bool) public authorizedInstitutions;

    // Public credential data
    struct CredentialPublicData {
        address issuer;
        uint256 issueDate;
        string credentialType;
        string achievementName;
        string achievementDescription;
        bool hasPrivateData;
    }

    // Encrypted private data (Inco FHE handles)
    struct CredentialPrivateData {
        bytes encryptedStudentId;    // FHE handle for student ID
        bytes encryptedGrade;        // FHE handle for grade
        bytes encryptedPersonalData; // FHE handle for combined personal data
    }

    // Access control for private data
    struct PrivateDataAccess {
        bool hasAccess;
        uint256 grantedAt;
        uint256 expiresAt;  // 0 = never expires
    }

    // Mappings
    mapping(uint256 => CredentialPublicData) public publicData;
    mapping(uint256 => CredentialPrivateData) private privateData;
    mapping(uint256 => mapping(address => PrivateDataAccess)) public privateDataAccess;
    mapping(uint256 => address[]) private accessList; // Track who has access

    // ============ Events ============

    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed issuer,
        address indexed recipient,
        string credentialType,
        bool hasPrivateData
    );

    event PrivateDataAccessGranted(
        uint256 indexed tokenId,
        address indexed viewer,
        uint256 expiresAt
    );

    event PrivateDataAccessRevoked(
        uint256 indexed tokenId,
        address indexed viewer
    );

    event InstitutionAuthorized(address indexed institution);
    event InstitutionRevoked(address indexed institution);

    // ============ Errors ============

    error NotAuthorizedInstitution();
    error TokenNotTransferable();
    error NotTokenOwner();
    error NoPrivateDataAccess();
    error NoPrivateData();
    error InvalidExpiration();
    error AccessExpired();

    // ============ Constructor ============

    constructor(address initialOwner) 
        ERC721("VeriChain Hybrid Credential", "VCHC") 
        Ownable(initialOwner)
    {}

    // ============ Modifiers ============

    modifier onlyAuthorizedInstitution() {
        if (!authorizedInstitutions[msg.sender]) {
            revert NotAuthorizedInstitution();
        }
        _;
    }

    modifier onlyTokenOwner(uint256 tokenId) {
        if (ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner();
        }
        _;
    }

    // ============ Institution Management ============

    function authorizeInstitution(address institution) external onlyOwner {
        authorizedInstitutions[institution] = true;
        emit InstitutionAuthorized(institution);
    }

    function revokeInstitution(address institution) external onlyOwner {
        authorizedInstitutions[institution] = false;
        emit InstitutionRevoked(institution);
    }

    // ============ Credential Issuance ============

    /**
     * @notice Issue a standard credential (public only)
     */
    function issueCredential(
        address recipient,
        string memory credentialType,
        string memory achievementName,
        string memory achievementDescription,
        string memory metadataURI
    ) external onlyAuthorizedInstitution returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, metadataURI);

        publicData[tokenId] = CredentialPublicData({
            issuer: msg.sender,
            issueDate: block.timestamp,
            credentialType: credentialType,
            achievementName: achievementName,
            achievementDescription: achievementDescription,
            hasPrivateData: false
        });

        emit CredentialIssued(tokenId, msg.sender, recipient, credentialType, false);

        return tokenId;
    }

    /**
     * @notice Issue a hybrid credential with encrypted private data
     * @param encryptedStudentId FHE encrypted handle for student ID
     * @param encryptedGrade FHE encrypted handle for grade
     * @param encryptedPersonalData FHE encrypted handle for personal data
     */
    function issueCredentialWithPrivateData(
        address recipient,
        string memory credentialType,
        string memory achievementName,
        string memory achievementDescription,
        string memory metadataURI,
        bytes memory encryptedStudentId,
        bytes memory encryptedGrade,
        bytes memory encryptedPersonalData
    ) external onlyAuthorizedInstitution returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, metadataURI);

        publicData[tokenId] = CredentialPublicData({
            issuer: msg.sender,
            issueDate: block.timestamp,
            credentialType: credentialType,
            achievementName: achievementName,
            achievementDescription: achievementDescription,
            hasPrivateData: true
        });

        privateData[tokenId] = CredentialPrivateData({
            encryptedStudentId: encryptedStudentId,
            encryptedGrade: encryptedGrade,
            encryptedPersonalData: encryptedPersonalData
        });

        // Auto-grant access to recipient and issuer
        _grantAccess(tokenId, recipient, 0);
        _grantAccess(tokenId, msg.sender, 0);

        emit CredentialIssued(tokenId, msg.sender, recipient, credentialType, true);

        return tokenId;
    }

    // ============ Private Data Access Control ============

    /**
     * @notice Grant access to private data (only token owner can do this)
     * @param tokenId The credential token ID
     * @param viewer Address to grant access to
     * @param duration How long access is valid (0 = forever)
     */
    function grantPrivateDataAccess(
        uint256 tokenId,
        address viewer,
        uint256 duration
    ) external onlyTokenOwner(tokenId) {
        if (!publicData[tokenId].hasPrivateData) {
            revert NoPrivateData();
        }

        uint256 expiresAt = duration == 0 ? 0 : block.timestamp + duration;
        _grantAccess(tokenId, viewer, expiresAt);

        emit PrivateDataAccessGranted(tokenId, viewer, expiresAt);
    }

    /**
     * @notice Revoke access to private data
     */
    function revokePrivateDataAccess(
        uint256 tokenId,
        address viewer
    ) external onlyTokenOwner(tokenId) {
        privateDataAccess[tokenId][viewer] = PrivateDataAccess({
            hasAccess: false,
            grantedAt: 0,
            expiresAt: 0
        });

        emit PrivateDataAccessRevoked(tokenId, viewer);
    }

    /**
     * @notice Check if an address has valid access to private data
     */
    function hasValidAccess(uint256 tokenId, address viewer) public view returns (bool) {
        PrivateDataAccess memory access = privateDataAccess[tokenId][viewer];
        
        if (!access.hasAccess) return false;
        if (access.expiresAt == 0) return true; // Never expires
        
        return block.timestamp <= access.expiresAt;
    }

    /**
     * @notice Get private data encrypted handles (only if caller has access)
     * @dev Returns handles that can be used with Inco re-encryption
     */
    function getPrivateData(uint256 tokenId) 
        external 
        view 
        returns (
            bytes memory encryptedStudentId,
            bytes memory encryptedGrade,
            bytes memory encryptedPersonalData
        ) 
    {
        if (!publicData[tokenId].hasPrivateData) {
            revert NoPrivateData();
        }

        if (!hasValidAccess(tokenId, msg.sender)) {
            revert NoPrivateDataAccess();
        }

        CredentialPrivateData memory data = privateData[tokenId];
        return (
            data.encryptedStudentId,
            data.encryptedGrade,
            data.encryptedPersonalData
        );
    }

    /**
     * @notice Get list of addresses with access to a credential's private data
     */
    function getAccessList(uint256 tokenId) 
        external 
        view 
        onlyTokenOwner(tokenId) 
        returns (address[] memory) 
    {
        return accessList[tokenId];
    }

    // ============ View Functions ============

    function getPublicData(uint256 tokenId) 
        external 
        view 
        returns (CredentialPublicData memory) 
    {
        return publicData[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ============ Soulbound Override ============

    /**
     * @dev Override to make tokens soulbound (non-transferable)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) and burning (to == address(0))
        // But block all transfers between addresses
        if (from != address(0) && to != address(0)) {
            revert TokenNotTransferable();
        }

        return super._update(to, tokenId, auth);
    }

    // ============ Internal Functions ============

    function _grantAccess(uint256 tokenId, address viewer, uint256 expiresAt) internal {
        privateDataAccess[tokenId][viewer] = PrivateDataAccess({
            hasAccess: true,
            grantedAt: block.timestamp,
            expiresAt: expiresAt
        });

        // Add to access list if not already present
        bool alreadyInList = false;
        for (uint i = 0; i < accessList[tokenId].length; i++) {
            if (accessList[tokenId][i] == viewer) {
                alreadyInList = true;
                break;
            }
        }
        if (!alreadyInList) {
            accessList[tokenId].push(viewer);
        }
    }

    // ============ Required Overrides ============

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
