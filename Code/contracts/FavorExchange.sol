// todo: make this in compliance with style guide
// https://solidity.readthedocs.io/en/v0.5.4/style-guide.html
// long function names, naming conventions, doxy comments

pragma solidity ^0.5.0;

contract FavorExchange {
    // ==================== type declarations ====================

    // stores information about a user
    struct User {
        // current funds
        uint balance;

        // flag indicating if user is registered
        bool is_registered;

        // public personal information
        bytes32 name;
        bytes32 public_key;
        bytes32 contact_info;
    }

    // stores information about a favor
    struct Favor {
        // list links
        bytes32 prev_favor_id;
        bytes32 next_favor_id;

        // essential information
        address client_addr;
        address provider_addr;
        uint cost;

        // metadata
        bytes32 title;
        bytes32 location;
        bytes32 description;
        uint category;

        // flags indicating votes of both parties
        bool client_vote_done;
        bool provider_vote_done;
        bool client_vote_cancel;
        bool provider_vote_cancel;
    }

    // ==================== state variables ====================

    // information about favor token
    string public constant name = "Favor Token";
    string public constant symbol = "FVR";
    uint8 public constant decimals = 0;
    uint private total_supply = 0;

    // dictionary of users
    mapping(address => User) private users;

    // linked list of favors
    mapping(bytes32 => Favor) private billboard;
    bytes32 billboard_head_id;

    // ==================== events ====================

    event BalanceChanged(address user_addr, uint new_balance);

    event FavorCreated(bytes32 favor_id);

    event FavorAccepted(bytes32 favor_id);

    event FavorVoteCancel(bytes32 favor_id, address user_addr);
    event FavorCancel(bytes32 favor_id);

    event FavorVoteDone(bytes32 favor_id, address user_addr);
    event FavorDone(bytes32 favor_id);

    // ==================== public functions ====================

    // returns total supply of tokens
    function totalSupply() public view returns (uint) {
        return total_supply;
    }

    // returns user's current balance
    function balanceOf(address _owner) public view returns (uint balance) {
        return users[_owner].balance;
    }

    // ==================== external functions ====================

    // demo only: acquires FVR with ether
    function demoBuyToken() external payable {
        users[msg.sender].balance += msg.value;
        total_supply += msg.value;
        emit BalanceChanged(msg.sender, users[msg.sender].balance);
    }

    // transfers tokens
    function transfer(address _to_addr, uint _value) external {
        // ensure that sender has sufficient funds
        require(users[msg.sender].balance >= _value, "Insufficient funds");

        // perform transfer
        users[msg.sender].balance -= _value;
        users[_to_addr].balance += _value;
        emit BalanceChanged(msg.sender, users[msg.sender].balance);
        emit BalanceChanged(_to_addr, users[_to_addr].balance);
    }

    // gets participating user's public information
    function getFavorUserInfo(bytes32 _favor_id, address _user_addr) external view returns (bytes32, bytes32, bytes32) {
        // ensure that both sender and user are involved
        require(_isUserInvolved(_favor_id, msg.sender), "No access to this favor");
        require(_isUserInvolved(_favor_id, _user_addr), "User not involved in this favor");

        // return user's information
        User memory user = users[_user_addr];
        return (user.name, user.public_key, user.contact_info);
    }

    // sets user's public information
    function setUserInfo(bytes32 _name, bytes32 _public_key, bytes32 _contact_info) external {
        users[msg.sender].is_registered = true;
        users[msg.sender].name = _name;
        users[msg.sender].public_key = _public_key;
        users[msg.sender].contact_info = _contact_info;
    }

    // gets id of the first favor in linked list
    function getFavorsHeadId() external view returns (bytes32) {
        return billboard_head_id;
    }

    // gets information about favor
    function getFavorInfo(bytes32 _favor_id) external view returns (bytes32, bytes32, address, address, uint, bytes32, bytes32, bytes32, uint) {
        Favor memory favor = billboard[_favor_id];
        return (favor.prev_favor_id, favor.next_favor_id,
                favor.client_addr, favor.provider_addr, favor.cost,
                favor.title, favor.location, favor.description, favor.category);
    }

    // creates a favor request
    function createRequest(uint _cost, bytes32 _title, bytes32 _location, bytes32 _description, uint _category) external returns (bytes32 favor_id) {
        // ensure that sender has sufficient funds
        require(users[msg.sender].balance >= 2 * _cost, "Insufficient funds");

        // deduct funds
        users[msg.sender].balance -= 2 * _cost;
        emit BalanceChanged(msg.sender, users[msg.sender].balance);

        // create favor request
        favor_id = _createFavor(msg.sender, address(0), _cost,
            _title, _location, _description, _category);
        emit FavorCreated(favor_id);
    }

    // creates a favor offer
    function createOffer(uint _cost, bytes32 _title, bytes32 _location, bytes32 _description, uint _category) external returns (bytes32 favor_id) {
        // ensure that sender has sufficient funds
        require(users[msg.sender].balance >= _cost, "Insufficient funds");

        // deduct funds
        users[msg.sender].balance -= _cost;
        emit BalanceChanged(msg.sender, users[msg.sender].balance);

        // create favor offer
        favor_id = _createFavor(address(0), msg.sender, _cost,
            _title, _location, _description, _category);
        emit FavorCreated(favor_id);
    }

    // accepts a favor request
    function acceptRequest(bytes32 _favor_id) external {
        // ensure that favor is a request
        require(_isFavorRequest(_favor_id), "Not a pending favor request");

        // ensure that sender is not already client
        require(msg.sender != billboard[_favor_id].client_addr, "Cannot accept own request");

        // ensure that sender has sufficient funds
        require(users[msg.sender].balance >= billboard[_favor_id].cost, "Insufficient funds");

        // deduct funds
        users[msg.sender].balance -= billboard[_favor_id].cost;
        emit BalanceChanged(msg.sender, users[msg.sender].balance);

        // accept request
        billboard[_favor_id].provider_addr = msg.sender;
        emit FavorAccepted(_favor_id);
    }

    // accepts a favor offer
    function acceptOffer(bytes32 _favor_id) external {
        // ensure that favor is an offer
        require(_isFavorOffer(_favor_id), "Not a pending favor offer");

        // ensure that sender is not already provider
        require(msg.sender != billboard[_favor_id].provider_addr, "Cannot accept own offer");

        // ensure that sender has sufficient funds
        require(users[msg.sender].balance >= 2 * billboard[_favor_id].cost, "Insufficient funds");

        // deduct funds
        users[msg.sender].balance -= 2 * billboard[_favor_id].cost;
        emit BalanceChanged(msg.sender, users[msg.sender].balance);

        // accept offer
        billboard[_favor_id].client_addr = msg.sender;
        emit FavorAccepted(_favor_id);
    }

    // votes for favor cancel
    function voteCancel(bytes32 _favor_id) external {
        // ensure that sender is a participant
        require(_isUserInvolved(_favor_id, msg.sender), "No access to this favor");

        // ensure that favor is matched
        require(_isFavorMatched(_favor_id), "Not a matched favor");

        // record vote
        if(msg.sender == billboard[_favor_id].client_addr) {
            billboard[_favor_id].client_vote_cancel = true;
        } else {
            billboard[_favor_id].provider_vote_cancel = true;
        }
        emit FavorVoteCancel(_favor_id, msg.sender);

        // check if both parties voted
        if(billboard[_favor_id].client_vote_cancel && billboard[_favor_id].provider_vote_cancel) {
            // refund funds
            users[billboard[_favor_id].client_addr].balance += 2 * billboard[_favor_id].cost;
            users[billboard[_favor_id].provider_addr].balance += billboard[_favor_id].cost;
            emit BalanceChanged(billboard[_favor_id].client_addr, users[billboard[_favor_id].client_addr].balance);
            emit BalanceChanged(billboard[_favor_id].provider_addr, users[billboard[_favor_id].provider_addr].balance);

            // clean up
            _clearFavor(_favor_id);

            // finalize cancel
            emit FavorCancel(_favor_id);
        }
    }

    // votes for favor completion
    function voteDone(bytes32 _favor_id) external {
        // ensure that sender is a participant
        require(_isUserInvolved(_favor_id, msg.sender), "No access to this favor");

        // ensure that favor is matched
        require(_isFavorMatched(_favor_id), "Not a matched favor");

        // record vote
        if(msg.sender == billboard[_favor_id].client_addr) {
            billboard[_favor_id].client_vote_done = true;
        } else {
            billboard[_favor_id].provider_vote_done = true;
        }
        emit FavorVoteDone(_favor_id, msg.sender);

        // check if both parties voted
        if(billboard[_favor_id].client_vote_done && billboard[_favor_id].provider_vote_done) {
            // transfer funds
            users[billboard[_favor_id].client_addr].balance += billboard[_favor_id].cost;
            users[billboard[_favor_id].provider_addr].balance += 2 * billboard[_favor_id].cost;
            emit BalanceChanged(billboard[_favor_id].client_addr, users[billboard[_favor_id].client_addr].balance);
            emit BalanceChanged(billboard[_favor_id].provider_addr, users[billboard[_favor_id].provider_addr].balance);

            // clean up
            _clearFavor(_favor_id);

            // finalize completion
            emit FavorDone(_favor_id);
        }
    }

    // ==================== private functions ====================

    // checks if favor is first in linked list
    function _isFavorHead(bytes32 _favor_id) private view returns (bool) {
        return (!_isFavorEmpty(_favor_id)) && (_favor_id == billboard_head_id);
    }

    // checks if favor is last in linked list
    function _isFavorTail(bytes32 _favor_id) private view returns (bool) {
        return (!_isFavorEmpty(_favor_id)) && (billboard[_favor_id].next_favor_id == _favor_id);
    }

    // checks if favor is empty
    function _isFavorEmpty(bytes32 _favor_id) private view returns (bool) {
        return (billboard[_favor_id].client_addr == address(0)) && (billboard[_favor_id].provider_addr == address(0));
    }

    // checks if favor is a request
    function _isFavorRequest(bytes32 _favor_id) private view returns (bool) {
        return (billboard[_favor_id].client_addr != address(0)) && (billboard[_favor_id].provider_addr == address(0));
    }

    // checks if favor is an offer
    function _isFavorOffer(bytes32 _favor_id) private view returns (bool) {
        return (billboard[_favor_id].client_addr == address(0)) && (billboard[_favor_id].provider_addr != address(0));
    }

    // checks if favor is matched
    function _isFavorMatched(bytes32 _favor_id) private view returns (bool) {
        return (billboard[_favor_id].client_addr != address(0)) && (billboard[_favor_id].provider_addr != address(0));
    }

    // checks if user is client or provider
    function _isUserInvolved(bytes32 _favor_id, address _user_addr) private view returns (bool) {
        return (_user_addr == billboard[_favor_id].client_addr) || (_user_addr == billboard[_favor_id].provider_addr);
    }

    // creates a favor
    function _createFavor(address _client_addr, address _provider_addr, uint _cost, bytes32 _title, bytes32 _location, bytes32 _description, uint _category) private returns (bytes32 favor_id) {
        // use hash as index
        favor_id = keccak256(abi.encodePacked(_client_addr, _provider_addr, _cost, _title, _location, _description, _category));

        // update linked list links
        if(_isFavorHead(billboard_head_id)) {
            // if head exists, update its link
            billboard[billboard_head_id].prev_favor_id = favor_id;
        } else {
            // otherwise, create first favor
            billboard_head_id = favor_id;
        }
        billboard[favor_id].prev_favor_id = favor_id;
        billboard[favor_id].next_favor_id = billboard_head_id;
        billboard_head_id = favor_id;

        // set essential information
        billboard[favor_id].client_addr = _client_addr;
        billboard[favor_id].provider_addr = _provider_addr;
        billboard[favor_id].cost = _cost;

        // set metadata
        billboard[favor_id].title = _title;
        billboard[favor_id].location = _location;
        billboard[favor_id].description = _description;
        billboard[favor_id].category = _category;

        // set vote flags
        billboard[favor_id].client_vote_done = false;
        billboard[favor_id].provider_vote_done = false;
        billboard[favor_id].client_vote_cancel = false;
        billboard[favor_id].provider_vote_cancel = false;
    }

    // clears a favor
    function _clearFavor(bytes32 _favor_id) private {
        // update linked list links
        billboard[billboard[_favor_id].prev_favor_id].next_favor_id = billboard[_favor_id].next_favor_id;
        billboard[billboard[_favor_id].next_favor_id].prev_favor_id = billboard[_favor_id].prev_favor_id;
        billboard[_favor_id].prev_favor_id = 0;
        billboard[_favor_id].next_favor_id = 0;

        // clear essential information
        billboard[_favor_id].client_addr = address(0);
        billboard[_favor_id].provider_addr = address(0);
        billboard[_favor_id].cost = 0;

        // clear metadata
        billboard[_favor_id].title = "";
        billboard[_favor_id].location = "";
        billboard[_favor_id].description = "";
        billboard[_favor_id].category = 0;

        // clear vote flags
        billboard[_favor_id].client_vote_done = false;
        billboard[_favor_id].provider_vote_done = false;
        billboard[_favor_id].client_vote_cancel = false;
        billboard[_favor_id].provider_vote_cancel = false;
    }
}
