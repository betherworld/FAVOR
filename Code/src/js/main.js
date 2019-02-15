// zero address
const NULL_ADDR = '0x0000000000000000000000000000000000000000';

App = {
    // ==================== member variables ====================

    web3Provider: null,  // web3 provider
    contracts: {},       // available contracts
    billboard: [],       // list of favors

    // ==================== generic functions ====================

    // default error handler
    defaultErrorHandler: function(err) {
        console.log(err.message);
    },

    // generic callback
    genericCallback: function(error, result, callback_func, param_attrib_name) {
        if (error) {
            console.log(error);
        } else {
            callback_func(result.args[param_attrib_name]);
        }
    },

    // ==================== init ====================

    // initializes App
    init: async function() {
        console.log("in App.init()");
        return await App.initWeb3();
    },

    // initializes web3
    initWeb3: async function() {
        console.log("in App.initWeb3()");
        if (window.ethereum) {
            // modern dapp browsers
            App.web3Provider = window.ethereum;
            try {
                // request account access
                await window.ethereum.enable();
            } catch (error) {
                // user denied account access
                console.error("User denied account access")
            }
        } else if (window.web3) {
            // legacy dapp browsers
            App.web3Provider = window.web3.currentProvider;
        } else {
            // no injected web3 instance is detected; fall back to Ganache
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);

        // init contract
        await App.initContract();
    },

    // initializes FavorExchange contract
    initContract: async function() {
        console.log("in App.initContract()");
        $.getJSON('FavorExchange.json', function(data) {
            // Get the necessary contract artifact file and instantiate it with truffle-contract
            App.contracts.FavorExchange = TruffleContract(data);

            // Set the provider for our contract
            App.contracts.FavorExchange.setProvider(App.web3Provider);

            App.contracts.FavorExchange.deployed().then(function(instance) {
                // bind events
                App.bindContractEvents(instance);
                // bind button presses
                App.bindButtonPresses();
                // init page elements
                App.initPage(instance);
            }).catch(App.defaultErrorHandler);
        });
    },

    // binds events emitted by contract
    bindContractEvents: async function(instance) {
        console.log("in App.bindContractEvents(", instance, ")");

        // bind event BalanceChanged(address user_addr)
        console.log("bind event BalanceChanged");
        instance.BalanceChanged().watch(function(error, result) {
            if (error) {
                console.log(error);
            } else {
                App.onBalanceChanged(result.args.user_addr, result.args.new_balance);
            }
        });

        // bind event FavorCreated(bytes32 favor_id)
        console.log("bind event FavorCreated");
        instance.FavorCreated().watch(function(error, result) {
            App.genericCallback(error, result, App.onFavorCreated, "favor_id");
        });

        // bind event FavorAccepted(bytes32 favor_id)
        console.log("bind event FavorAccepted");
        instance.FavorAccepted().watch(function(error, result) {
            App.genericCallback(error, result, App.onFavorAccepted, "favor_id");
        });

        // bind event FavorVoteCancel(bytes32 favor_id)
        console.log("bind event FavorVoteCancel");
        instance.FavorVoteCancel().watch(function(error, result) {
            App.genericCallback(error, result, App.onFavorVoteCancel, "favor_id");
        });

        // bind event FavorCancel(bytes32 favor_id)
        console.log("bind event FavorCancel");
        instance.FavorCancel().watch(function(error, result) {
            App.genericCallback(error, result, App.onFavorCancel, "favor_id");
        });

        // bind event FavorVoteDone(bytes32 favor_id)
        console.log("bind event FavorVoteDone");
        instance.FavorVoteDone().watch(function(error, result) {
            App.genericCallback(error, result, App.onFavorVoteDone, "favor_id");
        });

        // bind event FavorDone(bytes32 favor_id)
        console.log("bind event FavorDone");
        instance.FavorDone().watch(function(error, result) {
            App.genericCallback(error, result, App.onFavorDone, "favor_id");
        });
    },

    // inits page elements
    initPage: async function() {
        console.log("in App.initPage()");

        // retrieve and display balance
        App.getBalanceOf(web3.eth.accounts[0], function(result) {
            console.log("got balance",result);
            App.onBalanceChanged(web3.eth.accounts[0], result);
        });

        // retrieve and display billboard
        App.getBillboard();
    },

    bindButtonPresses: async function() {
        console.log("in App.bindButtonPresses()");
        // // todo
        console.log("Not implemented");
        // // examples:
        $(document).on('click', '.btn-demo-buy-token', App.demoBuyToken);
        $(document).on('click', '.btn-demo-populate-billboard', App.demoPopulateBillboard);
        $(document).on('click', '.btn-get-user-balance', () => {App.getUserBalance(App.uiRenderBalance);});
        $(document).on('click', '.btn-create-request', () => {
            App.createRequest({
                "cost": document.getElementById("inputCost").value,
                "title": document.getElementById("inputTitle").value,
                "location": document.getElementById("inputLocation").value,
                "description": document.getElementById("inputDescription").value,
                "category": document.getElementById("inputCategory").value
            });
        });
        // $(document).on('click', '.btn-create-offer', App.createOffer);
        $(document).on('click', '.btn-accept-request', () => {
            App.acceptRequest(this.id);
        });
        // $(document).on('click', '.btn-accept-fffer', App.acceptOffer);
        // $(document).on('click', '.btn-vote-cancel', App.voteCancel);
        // $(document).on('click', '.btn-vote-done', App.voteDone);
    },

    // ==================== contract event callbacks ====================

    onBalanceChanged: function(user_addr, new_balance) {
        console.log("in App.onBalanceChanged(", user_addr, ")");
        if (user_addr == web3.eth.accounts[0]) {
            App.uiRenderBalance(new_balance);
        }
    },

    onFavorAccepted: function(favor_id) {
        console.log("in App.onFavorAccepted(", favor_id, ")");
        // todo
        console.log("Not implemented");
    },

    onFavorCancel: function(favor_id) {
        console.log("in App.onFavorCancel(", favor_id, ")");
        // todo
        console.log("Not implemented");
    },

    onFavorVoteCancel: function(favor_id) {
        console.log("in App.onFavorVoteCancel(", favor_id, ")");
        // todo
        console.log("Not implemented");
    },

    onFavorDone: function(favor_id) {
        console.log("in App.onFavorDone(", favor_id, ")");
        // todo
        console.log("Not implemented");
    },

    onFavorVoteDone: function(favor_id) {
        console.log("in App.onFavorVoteDone(", favor_id, ")");
        // todo
        console.log("Not implemented");
    },

    onFavorCreated: function(favor_id) {
        console.log("in App.onFavorCreated(", favor_id, ")");
        // todo
        console.log("Not implemented");
    },

    // ==================== contract calls ====================

    // returns total token supply
    getTotalSupply: async function(callback_func) {
        console.log("in App.getTotalSupply(", callback_func, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.totalSupply.call();
        }).then(function(result) {
            return callback_func(result.c[0]);
        }).catch(App.defaultErrorHandler);
    },

    // returns user's balance
    getBalanceOf: async function(user_addr, callback_func) {
        console.log("in App.getBalanceOf(", user_addr, ", ", callback_func, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.balanceOf.call(user_addr);
        }).then(function(result) {
            return callback_func(result.c[0]);
        }).catch(App.defaultErrorHandler);
    },

    // demo: acquire FVR with ether
    demoBuyToken: async function(buy_amount) {
        console.log("in App.demoBuyToken(", buy_amount, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            instance.demoBuyToken({from: web3.eth.accounts[0], value: buy_amount});
        }).catch(App.defaultErrorHandler);
    },

    // resets the billboard and starts populating it
    getBillboard: async function() {
        console.log("in App.getBillboard()");
        // reset the billboard
        App.billboard = [];

        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.getFavorsHeadId.call();
        }).then(function(result) {
            console.log("billboard_head_id", result);
            // start populating
            App.addFavorToBillboard(result);
        }).catch(App.defaultErrorHandler);
    },

    // adds favor to the billboard
    addFavorToBillboard: async function(favor_id) {
        console.log("in App.addFavorToBillboard(", favor_id, ")");

        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.getFavorInfo.call(favor_id);
        }).then(function(result) {
            var favor = App.getFavorJSON(result, favor_id);
            console.log("on favor_id", favor);
            favor_nonempty = !(App.isFavorEmpty(favor));

            if(favor_nonempty) {
                // add to list
                App.billboard.push(favor);
            }

            if(favor_nonempty && (favor.next_favor_id != favor_id)) {
                // continue to next favor
                App.addFavorToBillboard(favor.next_favor_id);
            } else {
                // billboard empty or reached tail
                console.log("complete billboard:", App.billboard);
                App.uiRenderAllFavors();
            }
        }).catch(App.defaultErrorHandler);
    },

    // checks if favor is empty
    isFavorEmpty: function(favor_json) {
        return (favor_json.client_addr == NULL_ADDR) && (favor_json.provider_addr == NULL_ADDR);
    },

    // decodes favor JSON from raw data list; records favor's id
    // note conversion from bytes32
    getFavorJSON: function(favor_raw_list, favor_id) {
        return {
            "id": favor_id,
            "prev_favor_id" : favor_raw_list[0],
            "next_favor_id" : favor_raw_list[1],
            "client_addr" : favor_raw_list[2],
            "provider_addr" : favor_raw_list[3],
            "cost" : favor_raw_list[4].c[0],
            "title" : web3.toUtf8(favor_raw_list[5]),
            "location" : web3.toUtf8(favor_raw_list[6]),
            "description" : web3.toUtf8(favor_raw_list[7]),
            "category" : favor_raw_list[8].c[0]
        };
    },

    // requests user's balance
    getUserBalance: async function(callback_func) {
        console.log("in App.getUserBalance(", callback_func, ")");
        return App.getBalanceOf(web3.eth.accounts[0], callback_func);
    },

    // transfers tokens to address
    transferTokens: async function(to_addr, value) {
        console.log("in App.transferTokens(", to_addr, ", ", value, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.transfer(to_addr, value);
        }).catch(App.defaultErrorHandler);
    },

    // gets participating user's public information
    getFavorUserInfo: async function(favor_id, user_addr, callback_func) {
        console.log("in App.getFavorUserInfo(", favor_id, ", ", user_addr, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.getFavorUserInfo.call(favor_id, user_addr);
        }).then(function(result) {
            return callback_func(result);
        }).catch(App.defaultErrorHandler);
    },

    // decodes user's public information JSON from raw data list
    // note conversion from bytes32
    decodeUserInfo: function(user_info_raw_list) {
        return {
            "name": web3.toUtf8(user_info_raw_list[0]),
            "public_key": web3.toUtf8(user_info_raw_list[1]),
            "contact_info": web3.toUtf8(user_info_raw_list[2])
        };
    },

    // sets user's public information
    // note conversion to bytes32
    setUserInfo: async function(user_info_json) {
        console.log("in App.setUserInfo(", user_info_json, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.setUserInfo(
                web3.toUtf8(user_info_json.name),
                web3.toUtf8(user_info_json.public_key),
                web3.toUtf8(user_info_json.contact_info));
        }).catch(App.defaultErrorHandler);
    },

    // creates a favor request
    // note conversion to bytes32
    createRequest: async function(favor_json) {
        console.log("in App.createRequest(", favor_json, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.createRequest(
                favor_json.cost,
                web3.fromUtf8(favor_json.title),
                web3.fromUtf8(favor_json.location),
                web3.fromUtf8(favor_json.description),
                favor_json.category);
        }).catch(App.defaultErrorHandler);
    },

    // creates a favor offer
    // note conversion to bytes32
    createOffer: async function(favor_json) {
        console.log("in App.createOffer(", favor_json, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.createOffer(
                favor_json.cost,
                web3.fromUtf8(favor_json.title),
                web3.fromUtf8(favor_json.location),
                web3.fromUtf8(favor_json.description),
                favor_json.category);
        }).catch(App.defaultErrorHandler);
    },

    // accepts a favor request
    acceptRequest: async function(favor_id) {
        console.log("in App.acceptRequest(", favor_id, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.acceptRequest(favor_id);
        }).catch(App.defaultErrorHandler);
    },

    // accepts a favor offer
    acceptOffer: async function(favor_id) {
        console.log("in App.acceptOffer(", favor_id, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.acceptOffer(favor_id);
        }).catch(App.defaultErrorHandler);
    },

    // votes for favor cancel
    voteCancel: async function(favor_id) {
        console.log("in App.voteCancel(", favor_id, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.voteCancel(favor_id);
        }).catch(App.defaultErrorHandler);
    },

    // votes for favor completion
    voteDone: async function(favor_id) {
        console.log("in App.voteDone(", favor_id, ")");
        return App.contracts.FavorExchange.deployed().then(function(instance) {
            return instance.voteDone(favor_id);
        }).catch(App.defaultErrorHandler);
    },

    // ================== UI ==================

    uiRenderBalance: function(balance) {
        $('#balance').text(balance + ' ');
    },

    uiRenderAllFavors: function() {
        // todo: separate open requests, open offers and active favors and use corresponding templates?
        data = App.billboard;
        return data.map(App.fillRequestTemplate);
    },

    uiRenderOpenFavors: function() {
        $('#do_a_favor').removeClass('d-none');
        App.uiRenderFavors();
    },

    uiRenderRequests: function() {
        $('#my_requests').removeClass('d-none');
        $('#my_requests').append(App.getUserRequests().map(App.fillRequestTemplate));
    },

    getUserRequests: function() {
        // get a list of all favors requested by the user
        // todo: logic
        var userRequests = App.billboard.slice(0, 2);
        return userRequests;
    },

    uiTransactApplication: function(favorId) {
        // todo
        alert('Your transaction has been completed');
    },

    uiTransactAccept: function(favorId) {
        // todo
        alert('Your transaction has been completed');
    },

    uiRenderFavors: function() {
        $('#do_a_favor').append(App.uiRenderAllFavors());
    },

    uiRenderErrorPage: function() {
        // todo
    },

    uiRenderFavorApplication: function(favorId, data) {
        console.log("Rendering favor " + favorId);
        if (favorId === undefined || data === undefined) {
            console.log("Error: no such Favor!");
            return renderErrorPage();
        }

        $('#apply_for_favor').removeClass('d-none');
        $('#apply_for_favor').append(renderApplicationTemplate(data.filter(
            fav => {return fav.id == favorId;})[0]
        ));
    },

    createQueryHash: function(filters) {
        // todo: get the filters object, turn it into a string and write it into the hash.
    },

    fillFavorTemplate: function(fields) {
        var template = $("#favorTemplate").clone();
        template[0].id = "";
        template.removeClass('d-none');
        template.find('.favorTitle').text(fields.title);
        template.find('.favorDescription').text(fields.description);
        template.find('.favorCategory').text(fields.category);
        template.find('.favorCost').text(fields.cost);
        template.find('.favorLocation').text(fields.location);
        template.find('a').attr('href', '#Apply/'+fields.id);
        return template;
    },

    fillOfferTemplate: function(fields) {
        var template = $("#favorApplicationTemplate").clone();
        template[0].id = "";
        template.removeClass('d-none');
        template.find('.favorTitle').text(fields.title);
        template.find('.favorDescription').text(fields.description);
        template.find('.favorCategory').text(fields.category);
        template.find('.favorCost').text(fields.cost);
        template.find('.favorLocation').text(fields.location);
        template.find('a').attr('href', '#TransactApplication/'+fields.id);
        return template;
    },

    fillRequestTemplate: function(fields) {
        var template = $("#RequestTemplate").clone();
        template[0].id = "";
        template.removeClass('d-none');
        template.find('.favorTitle').text(fields.title);
        template.find('.favorDescription').text(fields.description);
        template.find('.favorCategory').text(fields.category);
        template.find('.favorCost').text(fields.cost);
        template.find('.favorLocation').text(fields.location);
        template.find('.performerAddress').text(fields.performer_addr);
        template.find('a').attr('href', '#TransactAccept/'+fields.id);
        template.find('a').attr('id', fields.id);
        // TODO: change 0x0000 to the ethereum NULL address
        if (fields.performer_addr != '0x0000') {
            template.find('.favor_available').removeClass('d-none');
            template.find('.favor_pending').addClass('d-none');
        }
        return template;
    }
};


// main
$(function () {
    $(window).load(function() {
        // on window load, initialize app
        App.init();
    });

    $(window).on('hashchange', function() {
        // on every hash change the render function is called with the new hash.
        // This is how the navigation of our app happens.
        render(decodeURI(window.location.hash));
    });
    $('.nav-link').on('click', function() {
        // on every hash change the render function is called with the new hash.
        // This is how the navigation of our app happens.
        render(decodeURI(window.location.hash));
    });


    // render home page by default
    render('');

    function render(url) {
        // Get the keyword from the url.
        var temp = url.split('/')[0];

        $('.main-content .page').addClass('d-none');

        var map = {
            // The Homepage.
            '': function() {
                App.uiRenderOpenFavors();
            },

            // todo: desc
            '#DoAFavor': function() {
                App.uiRenderOpenFavors();
            },

            // My open favor requests
            '#MyRequests': function() {
                App.uiRenderRequests();
            },

            // Favors I'm currently doing to someone
            '#MyFavors': function() {
                $('#my_favors').removeClass('d-none');
            },

            // todo: add desc
            '#Apply': function() {
                App.uiRenderFavorApplication(url.split('/')[1], App.billboard);
            },

            // todo: add desc
            '#TransactApplication': function() {
                App.uiTransactApplication(url.split('/')[1], App.billboard);
            },

            // todo: add desc
            '#TransactAccept': function() {
                App.uiTransactAccept(url.split('/')[1], App.billboard);
            }
        };

        if(map[temp]) {
            // Execute the needed function depending on the url keyword (stored in temp).
            map[temp]();
        } else {
            // If the keyword isn't listed in the above - render the error page.
            App.uiRenderErrorPage();
        }
    }
});
