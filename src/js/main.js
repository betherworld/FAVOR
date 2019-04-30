// zero address
const NULL_ADDR = "0x0000000000000000000000000000000000000000";

App = {
    // ==================== member variables ====================

    web3Provider: null,  // web3 provider
    contracts: {},       // available contracts

    billboard: [],       // full list of favors

    user_info_json: {},  // user info

    categories_list: [   // favor categories
        "All", "Household", "Cooking / Eating", "Plants", "Animals", "Office",
        "Entertainment / Company", "Family", "Accompanying", "Transport",
        "Lending / Sharing", "Miscellaneous"
    ],

    // ==================== generic functions ====================

    // default error handler
    _defaultErrorHandler: function(err) {
        console.log(err.message);
    },

    // generic callback
    _genericCallback: function(error, result, callback_func) {
        if(error) {
            console.log(error);
        } else {
            callback_func(result);
        }
    },

    // ==================== init ====================

    // initializes App
    init: function() {
        console.log("in App.init()");
        return App.initWeb3();
    },

    // initializes web3
    initWeb3: async function() {
        console.log("in App.initWeb3()");
        if(window.ethereum) {
            // modern dapp browsers
            App.web3Provider = window.ethereum;
            try {
                // request account access
                await window.ethereum.enable();
            } catch(error) {
                // user denied account access
                console.error("User denied account access")
            }
        } else if(window.web3) {
            // legacy dapp browsers
            App.web3Provider = window.web3.currentProvider;
        } else {
            // no injected web3 instance is detected; fall back to Ganache
            App.web3Provider = new Web3.providers.HttpProvider("http://localhost:7545");
        }
        web3 = new Web3(App.web3Provider);

        // init contract
        await App.initContract();
    },

    // initializes FavorExchange contract
    initContract: function() {
        console.log("in App.initContract()");
        $.getJSON("FavorExchange.json", function(data) {
            // Get the necessary contract artifact file and instantiate it with truffle-contract
            App.contracts.FavorExchange = TruffleContract(data);

            // Set the provider for our contract
            App.contracts.FavorExchange.setProvider(App.web3Provider);

            App.contracts.FavorExchange.deployed().then(async function(instance) {
                // init page elements
                await App.initPage();
                // bind events
                App.bindContractEvents(instance);
            }).catch(function(err) {console.log(err.message);});
        });
    },

    // binds events emitted by contract
    bindContractEvents: async function(instance) {
        console.log("in App.bindContractEvents(", instance, ")");
        instance.allEvents({fromBlock:'latest'}, function(error, event) {
            if (error) {
                console.log("Event error: ", error);
                return;
            }

            console.log("Event ", event.event, ", args: ", event.args);
            switch(event.event) {
            case "BalanceChanged":
                App.onBalanceChanged(event);
                break;
            case "FavorCreated":
                App.onFavorCreated(event);
                break;
            case "FavorMatched":
                App.onFavorMatched(event);
                break;
            case "FavorVoteCancel":
                App.onFavorVoteCancel(event);
                break;
            case "FavorCancel":
                App.onFavorCancel(event);
                break;
            case "FavorVoteDone":
                App.onFavorVoteDone(event);
                break;
            case "FavorDone":
                App.onFavorDone(event);
                break;
            }
        });
    },

    // inits page elements
    initPage: async function() {
        console.log("in App.initPage()");

        // populate lists of categories
        App.uiCategoriesPopulate();

        // retrieve user info
        var user_addr = web3.eth.accounts[0];
        App.contractGetUserInfo(user_addr, function(user_info_raw_list) {
            var user_info_json = App.contractUserInfoRawToJSON(user_info_raw_list)
            console.log("user info:", user_info_json);
            if(!user_info_json.is_registered) {
                console.log("new user; opening edit user info modal");
                App.modalEditUserOpenStrict();
            } else {
                console.log("existing user; displaying user info");
                App.user_info_json = user_info_json;
                App.uiUserInfoDisplay();
            }
        });

        // retrieve and display billboard
        await App.contractGetFullBillboard(App.uiBillboardDisplayFull);
    },

    // ==================== contract event callbacks ====================

    onBalanceChanged: function(result) {
        console.log("in App.onBalanceChanged(", result, ")");

        var user_addr = result.args.user_addr;
        var new_balance = result.args.new_balance;

        if(user_addr == web3.eth.accounts[0]) {
            App.uiBalanceSet(new_balance);
            // alert("Balance changed!");
        }
    },

    onFavorCreated: function(result) {
        console.log("in App.onFavorCreated(", result, ")");

        // get favor id
        var favor_id = result.args.favor_id;

        App.contracts.FavorExchange.deployed().then(function(instance) {
            // get favor info
            return instance.favorGetInfo.call(favor_id);
        }).then(function(result) {
            // assemble favor json
            var favor_json = App.contractFavorRawToJSON(result, favor_id);
            // add missing user name
            return App.contractFavorJSONSetUserNames(favor_json);
        }).then(function(new_favor_json) {
            // add to billboard
            App.billboard.push(new_favor_json);
            // add to page
            App.uiFavorAdd(new_favor_json);
        }).catch(function(err) {console.log(err.message);});
    },

    onFavorMatched: function(result) {
        console.log("in App.onFavorMatched(", result, ")");

        // get favor id, index, and json
        var favor_id = result.args.favor_id;
        var favor_idx = App.billboardGetFavorIndex(favor_id);
        var favor_json = App.billboard[favor_idx];

        // add matched user
        var user_addr = result.args.user_addr;
        if(favor_json.client_addr == NULL_ADDR) {
            favor_json.client_addr = user_addr;
        } else {
            favor_json.provider_addr = user_addr;
        }

        // add missing user name
        App.contractFavorJSONSetUserNames(favor_json).then(function(new_favor_json) {
            // update billboard entry
            App.billboard[favor_idx] = new_favor_json;
            // update style
            App.uiFavorUpdate(favor_id, NULL_ADDR);
        });
    },

    onFavorVoteCancel: function(result) {
        console.log("in App.onFavorVoteCancel(", result, ")");

        // get favor id and index
        var favor_id = result.args.favor_id;
        var favor_idx = App.billboardGetFavorIndex(favor_id);

        // register vote
        var user_addr = result.args.user_addr;
        if(App.billboard[favor_idx].client_addr == user_addr) {
            App.billboard[favor_idx].client_vote_cancel = true;
        } else {
            App.billboard[favor_idx].provider_vote_cancel = true;
        }

        // update style
        App.uiFavorUpdate(favor_id, NULL_ADDR);
    },

    onFavorCancel: function(result) {
        console.log("in App.onFavorCancel(", result, ")");

        // get favor id
        var favor_id = result.args.favor_id;

        // delete from page
        App.uiFavorUpdate(favor_id, NULL_ADDR);

        // delete from billboard
        App.billboardDeleteFavorByID(favor_id);
    },

    onFavorVoteDone: function(result) {
        console.log("in App.onFavorVoteDone(", result, ")");

        // get favor id and index
        var favor_id = result.args.favor_id;
        var favor_idx = App.billboardGetFavorIndex(favor_id);

        // register vote
        var user_addr = result.args.user_addr;
        if(App.billboard[favor_idx].client_addr == user_addr) {
            App.billboard[favor_idx].client_vote_done = true;
        } else {
            App.billboard[favor_idx].provider_vote_done = true;
        }

        // update style
        App.uiFavorUpdate(favor_id, user_addr);
    },

    onFavorDone: function(result) {
        console.log("in App.onFavorDone(", result, ")");

        // get favor id
        var favor_id = result.args.favor_id;

        // delete from page
        App.uiFavorUpdate(favor_id, NULL_ADDR);

        // delete from billboard
        App.billboardDeleteFavorByID(favor_id);
    },

    // ==================== contract calls ====================

    // -------------------- data handling --------------------

    // checks if favor is empty
    contractFavorIsEmpty: function(favor_json) {
        return(favor_json.client_addr == NULL_ADDR) && (favor_json.provider_addr == NULL_ADDR);
    },

    // decodes favor JSON from raw data list; records favor"s id
    contractFavorRawToJSON: function(favor_raw_list, favor_id) {
        // note conversion from bytes32 to utf8
        console.log(favor_raw_list);
        return {
            // identifier
            "id": favor_id,

            // list links
            "prev_favor_id": favor_raw_list[0],
            "next_favor_id": favor_raw_list[1],

            // essential information
            "client_addr": favor_raw_list[2],
            "provider_addr": favor_raw_list[3],
            "cost": favor_raw_list[4].c[0],

            // metadata
            "title": web3.toUtf8(favor_raw_list[5]),
            "location": web3.toUtf8(favor_raw_list[6]),
            "description": web3.toUtf8(favor_raw_list[7]),
            "category": favor_raw_list[8].c[0],

            // flags indicating votes of both parties
            "client_vote_done": favor_raw_list[9],
            "provider_vote_done": favor_raw_list[10],
            "client_vote_cancel": favor_raw_list[11],
            "provider_vote_cancel": favor_raw_list[12],

            // user names, to be filled in later
            "client_name": "",
            "provider_name": ""
        };
    },

    // adds missing user names
    contractFavorJSONSetUserNames: async function(favor_json) {
        if((favor_json.client_addr != NULL_ADDR) && (favor_json.client_name == "")) {
            await App.contractGetUserInfo(favor_json.client_addr, function(user_info_raw_list) {
                favor_json.client_name = App.contractUserInfoRawToJSON(user_info_raw_list).name;
            });
        }
        if((favor_json.provider_addr != NULL_ADDR) && (favor_json.provider_name == "")) {
            await App.contractGetUserInfo(favor_json.provider_addr, function(user_info_raw_list) {
                favor_json.provider_name = App.contractUserInfoRawToJSON(user_info_raw_list).name;
            });
        }
        return favor_json;
    },

    // decodes user's public information JSON from raw data list
    contractUserInfoRawToJSON: function(user_info_raw_list) {
        // note conversion from bytes32 to utf8
        return {
            "balance": user_info_raw_list[0].c[0],
            "is_registered": user_info_raw_list[1],
            "name": web3.toUtf8(user_info_raw_list[2]),
            "public_key": web3.toUtf8(user_info_raw_list[3]),
            "contact_info": web3.toUtf8(user_info_raw_list[4])
        };
    },

    // -------------------- favor manipulation --------------------

    // creates a new favor
    contractCreateFavor: function(favor_json) {
        // note conversion to bytes32
        console.log("in App.contractCreateFavor(", favor_json, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            var instance_call = (favor_json.type == "request" ? instance.favorRequestCreate : instance.favorOfferCreate);
            return instance_call(
                favor_json.cost,
                web3.fromUtf8(favor_json.title),
                web3.fromUtf8(favor_json.location),
                web3.fromUtf8(favor_json.description),
                favor_json.category
            );
        }).catch(function(err) {console.log(err.message);});
    },

    // determines favor type and accepts it
    contractAcceptFavor: function(favor_id) {
        console.log("in App.contractAcceptFavor(", favor_id, ")");
        if (App.billboardGetFavorByID(favor_id).client_addr != NULL_ADDR) {
            App.contractAcceptRequest(favor_id);
        } else {
            App.contractAcceptOffer(favor_id);
        }
    },

    // accepts a favor request
    contractAcceptRequest: function(favor_id) {
        console.log("in App.contractAcceptRequest(", favor_id, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.favorRequestAccept(favor_id);
        }).catch(function(err) {console.log(err.message);});
    },

    // accepts a favor offer
    contractAcceptOffer: function(favor_id) {
        console.log("in App.contractAcceptOffer(", favor_id, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.favorOfferAccept(favor_id);
        }).catch(function(err) {console.log(err.message);});
    },

    // votes for favor cancel
    contractVoteCancel: function(favor_id) {
        console.log("in App.contractVoteCancel(", favor_id, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.favorVoteCancel(favor_id);
        }).catch(function(err) {console.log(err.message);});
    },

    // votes for favor completion
    contractVoteDone: function(favor_id) {
        console.log("in App.contractVoteDone(", favor_id, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.favorVoteDone(favor_id);
        }).catch(function(err) {console.log(err.message);});
    },

    // -------------------- user info manipulation --------------------

    // returns user's balance
    contractGetBalanceOf: function(user_addr, callback_func) {
        console.log("in App.contractGetBalanceOf(", user_addr, ", ", callback_func, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.balanceOf.call(user_addr);
        }).then(function(result) {
            return callback_func(result.c[0]);
        }).catch(function(err) {console.log(err.message);});
    },

    // gets participating user's public information
    contractGetUserInfo: function(user_addr, callback_func) {
        console.log("in App.contractGetUserInfo(", user_addr, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.userGetInfo.call(user_addr);
        }).then(function(result) {
            return callback_func(result);
        }).catch(function(err) {console.log(err.message);});
    },

    // sets user's public information
    contractSetUserInfo: function(user_info_json) {
        // note conversion from utf8 to bytes32
        console.log("in App.contractSetUserInfo(", user_info_json, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.userSetInfo(
                web3.fromUtf8(user_info_json.name),
                web3.fromUtf8(user_info_json.public_key),
                web3.fromUtf8(user_info_json.contact_info));
        }).catch(function(err) {console.log(err.message);});
    },

    // -------------------- billboard construction --------------------

    // resets the billboard and starts populating it
    contractGetFullBillboard: function(callback_func) {
        console.log("in App.contractGetFullBillboard(", callback_func, ")");

        // reset the billboard
        App.billboard = [];

        return App.contracts.FavorExchange.deployed().then(function(instance) {
            // get id of first favor in list
            return instance.favorGetListHeadId.call();
        }).then(function(result) {
            console.log("billboard_head_id", result);
            // start populating the billboard
            App.contractAddFavorToBillboard(result, callback_func);
        }).catch(function(err) {console.log(err.message);});
    },

    // adds favor to the billboard
    contractAddFavorToBillboard: function(favor_id, callback_func) {
        console.log("in App.contractAddFavorToBillboard(", favor_id, ")");

        return App.contracts.FavorExchange.deployed().then(async function(instance) {
            return [await instance.favorGetInfo.call(favor_id), instance];
        }).then(async function(result) {
            console.log(result);
            return [result[0], await result[1].favorGetFlags.call(favor_id)];
        }).then(function(result) {
            console.log(result);
            var favor = App.contractFavorRawToJSON(result[0].concat(result[1]), favor_id);
            console.log("on favor_id", favor);
            favor_nonempty = !(App.contractFavorIsEmpty(favor));

            if(favor_nonempty) {
                // add to list
                App.billboard.push(favor);
            }

            if(favor_nonempty &&(favor.next_favor_id != favor_id)) {
                // continue to next favor
                App.contractAddFavorToBillboard(favor.next_favor_id, callback_func);
            } else {
                // billboard empty or reached tail
                console.log("complete billboard:", App.billboard);
                callback_func();
            }
        }).catch(function(err) {console.log(err.message);});
    },

    // -------------------- misc functions --------------------

    // returns total token supply
    contractGetTotalSupply: function(callback_func) {
        console.log("in App.contractGetTotalSupply(", callback_func, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.totalSupply.call();
        }).then(function(result) {
            return callback_func(result.c[0]);
        }).catch(function(err) {console.log(err.message);});
    },

    // transfers tokens to address
    contractTransfer: function(to_addr, value) {
        console.log("in App.contractTransfer(", to_addr, ", ", value, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.transfer(to_addr, value);
        }).catch(function(err) {console.log(err.message);});
    },

    // demo: acquires FVR with ether
    contractDemoBuyFvr: function(buy_amount) {
        console.log("in App.contractDemoBuyFvr(", buy_amount, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            instance.demoBuyToken({from: web3.eth.accounts[0], value: buy_amount});
        }).catch(function(err) {console.log(err.message);});
    },

    // demo: populates mock billboard
    contractDemoPopulateBillboard: function() {
        console.log("in App.contractDemoPopulateBillboard()");

        var favor_1_json = {
            "cost": 1,
            "title": "Title 1",
            "location": "Location 1",
            "description": "Description 1",
            "category": 1
        };
        var favor_2_json = {
            "cost": 2,
            "title": "Title 2",
            "location": "Location 2",
            "description": "Description 2",
            "category": 2
        };

        App.contractCreateFavor(favor_1_json);
        App.contractCreateFavor(favor_2_json);
    },

    // ==================== billboard logic ====================

    billboardGetFavorIndex: function(favor_id) {
        for(var i = App.billboard.length - 1; i >= 0; i--) {
            if(App.billboard[i].id == favor_id) {
                return i;
            }
        }
        return -1;
    },

    billboardGetFavorByID: function(favor_id) {
        return App.billboard.find(function(element) {return element.id == favor_id;});
    },

    billboardGetFavorByIndex: function(favor_idx) {
        return App.billboard[favor_idx];
    },

    billboardDeleteFavorByID: function(favor_id) {
        App.billboardDeleteFavorByIndex(App.billboardGetFavorIndex(favor_id));
    },

    billboardDeleteFavorByIndex: function(favor_idx) {
        if(favor_idx < 0 || favor_idx >= App.billboard.length) {
            // feature: add error handling
            return;
        }
        App.billboard.splice(favor_idx, 1);
    },

    // ==================== modals ====================

    // -------------------- edit user info --------------------

    modalEditUserOpenStrict: function() {
        // open modal with no closing options (close button, click away, Esc key)
        $("#btn-edit-user-close").hide();
        $("#modal-edit-user").modal({backdrop: 'static', keyboard: false});
    },

    modalEditUserOpen: function() {
        // open modal with all closing options
        $("#btn-edit-user-close").show();
        $("#modal-edit-user").modal();
    },

    modalEditUserGenerateEncryptionKeys: function() {
        // feature: generate encryption key pair
    },

    modalEditUserSave: async function() {
        // get new user info
        var new_user_info_json = {
            "balance": App.user_info_json.balance,
            "name": $("#edit-user-name")["0"].value,
            "location": $("#edit-user-location")["0"].value,
            "public_key": $("#edit-user-public-key")["0"].value,
            "contact_info": $("#edit-user-contact")["0"].value
        };

        // verify data
        if(new_user_info_json.name == "" ||
           new_user_info_json.location == "" ||
           new_user_info_json.public_key == "" ||
           new_user_info_json.contact_info == "") {
            alert("Please fill in all the required fields");
            return;
        }

        // save new user info
        App.user_info_json = new_user_info_json;

        App.uiUserInfoDisplay();

        // hide modal
        // todo later: place after contract request
        $("#modal-edit-user").modal("hide");

        // submit new user info
        await App.contractSetUserInfo(new_user_info_json);
    },

    modalEditUserClose: function() {
        // restore previous user info
        $("#edit-user-name")["0"].value = App.user_info_json.name;
        $("#edit-user-location")["0"].value = App.user_info_json.location;
        $("#edit-user-public-key")["0"].value = App.user_info_json.public_key;
        $("#edit-user-contact")["0"].value = App.user_info_json.contact_info;

        // hide modal
        $("#modal-edit-user").modal("hide");
    },

    // -------------------- balance --------------------

    modalBalanceOpen: function() {
        // open modal
        $("#modal-buy-fvr").modal();
    },

    modalBalanceDemoBuy: async function() {
        // get number of tokens to buy
        var value = parseInt($("#buy-fvr-val")["0"].value);

        // verify data
        if(isNaN(value) || value <= 0) {
            alert("Please enter a positive value");
            return;
        }

        // hide modal
        // todo later: place after contract request
        $("#modal-buy-fvr").modal("hide");

        // submit buy request
        await App.contractDemoBuyFvr(value);
    },

    // -------------------- new favor --------------------

    modalNewFavorOpen: function() {
        // open modal
        $("#modal-new-favor").modal();
    },

    modalNewFavorCreate: async function() {
        // get new favor data
        // note: user address is set automatically by contract
        var new_favor_json = {
            "cost": parseInt($("#new-favor-cost")["0"].value),
            "title": $("#new-favor-title")["0"].value,
            "location": $("#new-favor-location")["0"].value,
            "description": $("#new-favor-desc")["0"].value,
            "category": parseInt($("#new-favor-cat")["0"].value)
        };

        if($("#new-favor-type-req")["0"].checked) {
            new_favor_json.type = "request";
        } else {
            new_favor_json.type = "offer";
        }

        // verify data
        if(isNaN(new_favor_json.cost) ||
           new_favor_json.title == "" ||
           new_favor_json.location == "" ||
           new_favor_json.description == "" ||
           isNaN(new_favor_json.category)) {
            alert("Please fill in all the required fields");
            return;
        }

        // hide modal
        // todo later: place after contract request
        $("#modal-new-favor").modal("hide");

        // submit favor for creation
        await App.contractCreateFavor(new_favor_json);
    },

    modalNewFavorClose: function() {
        // hide modal
        $("#modal-new-favor").modal("hide");
    },

    // -------------------- view user info --------------------

    modalViewUserOpen: function() {
        // feature
    },

    modalViewUserClose: function() {
        // feature
    },

    // ==================== filter and search ====================

    searchFilter: function() {
        // feature
    },

    searchReset: function() {
        // feature
    },

    // ==================== favor manipulation ====================

    favorAccept: function(button) {
        App.contractAcceptFavor(button.parentNode.parentNode.parentNode.id);
    },

    favorDelete: function(button) {
        // feature
    },

    favorVoteCancel: function(button) {
        App.contractVoteCancel(button.parentNode.parentNode.parentNode.id);
    },

    favorVoteDone: function(button) {
        App.contractVoteDone(button.parentNode.parentNode.parentNode.id);
    },

    // ==================== UI ====================

    // -------------------- categories --------------------

    uiCategoriesPopulate: function() {
        var len = App.categories_list.length;

        // "all" option
        var option_orig = document.createElement("option");
        option_orig.value = 0;
        option_orig.innerHTML = App.categories_list[0];
        $("#side-menu-search-cat")["0"].appendChild(option_orig);

        for(i = 1; i < len; i++) {
            // regular options
            var option_orig = document.createElement("option");
            option_orig.value = i;
            option_orig.innerHTML = App.categories_list[i];
            var option_copy = option_orig.cloneNode(true);

            $("#side-menu-search-cat")["0"].appendChild(option_orig);
            $("#new-favor-cat")["0"].appendChild(option_copy);
        }
    },

    // -------------------- user info --------------------

    uiUserInfoDisplay: function() {
        // display user info
        console.log("in uiUserInfoDisplay, user_info_json: ", App.user_info_json);
        App.uiBalanceSet(App.user_info_json.balance);
        App.uiUserNameSet(App.user_info_json.name);
        App.uiUserLocationSet(App.user_info_json.location);
        App.uiUserPublicKeySet(App.user_info_json.public_key);
        App.uiUserContactInfoSet(App.user_info_json.contact_info);
    },

    uiBalanceSet: function(balance) {
        if(typeof balance !== "undefined") {
            $("#user-balance-value").text(balance);
        }
    },

    uiUserNameSet: function(name) {
        if(typeof name !== "undefined") {
            $("#side-user-name").text(name);
            $("#edit-user-name")["0"].value = name;
        }
    },

    uiUserLocationSet: function(location) {
        if(typeof location !== "undefined") {
            $("#edit-user-location").text(location);
            $("#edit-user-location")["0"].value = location;
            $("#new-favor-location").text(location);
            $("#new-favor-location")["0"].value = location;
        }
    },

    uiUserPublicKeySet: function(public_key) {
        // feature
        if(typeof public_key !== "undefined") {
            $("#edit-user-public-key").text(public_key);
            $("#edit-user-public-key")["0"].value = public_key;
        }
    },

    uiUserContactInfoSet: function(contact) {
        if(typeof contact !== "undefined") {
            $("#edit-user-contact").text(contact);
            $("#edit-user-contact")["0"].value = contact;
        }
    },

    // -------------------- favors --------------------

    uiBillboardDisplayFull: function() {
        // feature: this is a stab
        console.log("in uiBillboardDisplayFull()");
        for(var i = App.billboard.length - 1; i >= 0; i--) {
            console.log("uiBillboardDisplayFull index:", i);
            // add missing user name
            App.contractFavorJSONSetUserNames(App.billboard[i]).then(function(new_favor_json) {
                // update billboard entry
                App.billboard[i] = new_favor_json;
                // add to page
                App.uiFavorAdd(App.billboard[i]);
            });
        }
    },

    uiFavorAdd: function(favor_json) {
        console.log("adding favor ", favor_json);

        // clone the template
        var favor = $("#favor-template")["0"].cloneNode(true);

        // show
        favor.hidden = false;
        // set favor id
        favor.id = favor_json.id;
        // set title
        favor.querySelector(".favor-title").innerHTML = favor_json.title;
        // set category
        favor.querySelector(".favor-category").innerHTML = App.categories_list[favor_json.category];
        // set location
        favor.querySelector(".favor-location").innerHTML = favor_json.location;
        // set provider name
        favor.querySelector(".favor-provider").innerHTML = favor_json.provider_name;
        // set client name
        favor.querySelector(".favor-client").innerHTML = favor_json.client_name;
        // set description
        favor.querySelector(".favor-description").innerHTML = favor_json.description;
        // set cost
        favor.querySelector(".favor-cost").innerHTML = favor_json.cost;

        // append to billboard
        // feature: filter and sort
        $("#billboard")["0"].appendChild(favor);

        // set style
        App.uiFavorUpdate(favor.id, NULL_ADDR);
    },

    uiFavorUpdate: function(favor_id) {
        var favor_bb = App.billboardGetFavorByID(favor_id);
        var favor_pg = $("#" + favor_id)["0"];

        // hide all buttons
        favor_pg.querySelector(".favor-accept").hidden = true;
        favor_pg.querySelector(".favor-delete").hidden = true;
        favor_pg.querySelector(".favor-vote-cancel").hidden = true;
        favor_pg.querySelector(".favor-vote-done").hidden = true;

        if((favor_bb.client_addr == NULL_ADDR) || (favor_bb.provider_addr == NULL_ADDR)) {
            return App.uiFavorUnmatched(favor_pg);
        }

        if(favor_bb.client_vote_cancel && favor_bb.provider_vote_cancel) {
            return App.uiFavorCancel(favor_pg);
        }

        if(favor_bb.client_vote_done && favor_bb.provider_vote_done) {
            return App.uiFavorDone(favor_pg);
        }

        if(favor_bb.client_vote_cancel || favor_bb.provider_vote_cancel) {
            return App.uiFavorVoteCancel(favor_pg);
        }

        if(favor_bb.client_vote_done || favor_bb.provider_vote_done) {
            return App.uiFavorVoteDone(favor_pg);
        }

        return App.uiFavorMatched(favor_pg);
    },

    _userInvolvement(favor_id) {
        var favor_bb = App.billboardGetFavorByID(favor_id);
        var user_addr = web3.eth.accounts[0];

        if((favor_bb.client_addr != user_addr) && (favor_bb.provider_addr != user_addr)) {
            // not involved
            return 0;
        }

        if(favor_bb.client_addr == user_addr){
            if (favor_bb.client_vote_cancel) {
                // voted cancel
                return 1;
            }
            if(favor_bb.client_vote_done) {
                // voted done
                return 2;
            }
            // didn't vote
            return 3;
        }

        if (favor_bb.provider_vote_cancel) {
            // voted cancel
            return 1;
        }
        if(favor_bb.provider_vote_done) {
            // voted done
            return 2;
        }
        // didn't vote
        return 3;
    },

    uiFavorUnmatched: function(favor_pg) {
        switch(App._userInvolvement(favor_pg.id, NULL_ADDR)) {
        case 0:
            favor_pg.className = "favor favor-unmatched";
            favor_pg.querySelector(".favor-accept").hidden = false;
            break;
        default:
            favor_pg.className = "favor favor-user-unmatched";
            break;
        }
    },

    uiFavorMatched: function(favor_pg) {
        switch(App._userInvolvement(favor_pg.id, NULL_ADDR)) {
        case 0:
            favor_pg.className = "favor favor-matched";
            break;
        default:
            favor_pg.className = "favor favor-user-matched";
            favor_pg.querySelector(".favor-vote-cancel").hidden = false;
            favor_pg.querySelector(".favor-vote-done").hidden = false;
            break;
        }
    },

    uiFavorVoteCancel: function(favor_pg, user_addr) {
        switch(App._userInvolvement(favor_pg.id, user_addr)) {
        case 1:
            favor_pg.className = "favor favor-user-self-vote-cancel";
            favor_pg.querySelector(".favor-vote-done").hidden = false;
            break;
        case 2:
        case 3:
            favor_pg.className = "favor favor-user-other-vote-cancel";
            favor_pg.querySelector(".favor-vote-cancel").hidden = false;
            favor_pg.querySelector(".favor-vote-done").hidden = false;
            break;
        default:
            favor_pg.className = "favor favor-vote-cancel";
            break;
        }
    },

    uiFavorVoteDone: function(favor_pg, user_addr) {
        switch(App._userInvolvement(favor_pg.id, user_addr)) {
        case 2:
            favor_pg.className = "favor favor-user-self-vote-done";
            favor_pg.querySelector(".favor-vote-cancel").hidden = false;
            break;
        case 1:
        case 3:
            favor_pg.className = "favor favor-user-other-vote-done";
            favor_pg.querySelector(".favor-vote-cancel").hidden = false;
            favor_pg.querySelector(".favor-vote-done").hidden = false;
            break;
        default:
            favor_pg.className = "favor favor-vote-done";
            break;
        }
    },

    uiFavorCancel: function(favor_pg) {
        App.uiFavorDelete(favor_pg);
    },

    uiFavorDone: function(favor_pg) {
        App.uiFavorDelete(favor_pg);
    },

    uiFavorDelete: function(favor_pg) {
        if(typeof favor_pg !== "undefined") {
            // delete favor from page
            favor_pg.parentNode.removeChild(favor_pg);
        }
    }
};


// main
$(window).on("load", function() {
    // on window load, initialize app
    App.init();

    // todo: doc comments for all functions
    // feature: ability to delete unmatched favors
    // feature: disable buttons instead of hiding them in some cases
});
