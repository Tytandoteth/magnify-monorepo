// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NFTYNotes is ERC721, AccessControl, ReentrancyGuard {
    using Address for address;
    using Strings for uint256;

    bytes32 public constant NFTY_LENDING = keccak256("NFTY_LENDING");
    bytes32 public constant BASE_URI_ROLE = keccak256("BASE_URI_ROLE");

    string public baseURI;

    constructor(
        string memory name,
        string memory symbol,
        string memory customBaseURI
    ) ERC721(name, symbol) {
        require(bytes(name).length > 0, "NFTYNotes: name cannot be empty");
        require(bytes(symbol).length > 0, "NFTYNotes: symbol cannot be empty");
        require(
            bytes(customBaseURI).length > 0,
            "NFTYNotes: customBaseURI cannot be empty"
        );

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(BASE_URI_ROLE, msg.sender);
        _setBaseURI(customBaseURI);
    }

    modifier onlyNftyLending() {
        require(
            hasRole(NFTY_LENDING, msg.sender),
            "NFTYNotes: caller is not NFTYLending"
        );
        _;
    }

    modifier onlyBaseUriRole() {
        require(
            hasRole(BASE_URI_ROLE, msg.sender),
            "NFTYNotes: caller is not a base URI role"
        );

        _;
    }

    function setNftyLending(
        address account
    ) external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "account cannot be zero address");
        grantRole(NFTY_LENDING, account);
    }

    function mint(
        address to,
        uint256 loanId
    ) external nonReentrant onlyNftyLending {
        require(to != address(0), "NFTYNotes: to address cannot be zero");
        require(!_exists(loanId), "NFTYNotes: loan already exists");

        _safeMint(to, loanId);
        emit Minted(to, loanId);
    }

    function burn(uint256 loanId) external nonReentrant onlyNftyLending {
        require(_exists(loanId), "NFTYNotes: loan does not exist");

        _burn(loanId);
        emit Burned(loanId);
    }

    function setBaseURI(
        string memory customBaseURI
    ) external nonReentrant onlyBaseUriRole {
        require(
            bytes(customBaseURI).length > 0,
            "NFTYNotes: customBaseURI cannot be empty"
        );

        _setBaseURI(customBaseURI);
        emit BaseURISet(customBaseURI, msg.sender);
    }

    function _setBaseURI(string memory _baseURI_) internal virtual {
        baseURI = _baseURI_;
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(_exists(tokenId), "NFTYNotes: URI query for nonexistent token");

        if (bytes(baseURI).length > 0) {
            return string(abi.encodePacked(baseURI, tokenId.toString()));
        } else {
            return "";
        }
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function exists(uint256 _tokenId) external view returns (bool) {
        return _exists(_tokenId);
    }

    event Minted(address indexed to, uint256 indexed loanId);
    event Burned(uint256 indexed loanId);
    event BaseURISet(string indexed baseURI, address indexed baseUriRole);
}
