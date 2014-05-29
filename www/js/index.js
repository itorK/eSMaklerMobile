/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var db;
var kod;
var serv = "";
var phonegap_initialize = false;

App = Ember.Application.create({LOG_TRANSITIONS: true, LOG_TRANSITIONS_INTERNAL: true,
    LOG_VIEW_LOOKUPS: true});
App.reopen({
    phoneGapApp: {
        initialize: function() {
            this.bindEvents();
        },
        bindEvents: function() {
            document.addEventListener('deviceready', this.onDeviceReady, false);
        },
        onDeviceReady: function() {
            App.phoneGapApp.receivedEvent('deviceready');
        },
        receivedEvent: function(id) {

            phonegap_initialize = true;
            console.log('Received Event: ' + id);
            db = App.phoneGapApp.prepareDatabase();
            var span = document.getElementById('doc-count');
            db.transaction(function(tx) {

                tx.executeSql('CREATE TABLE parametry (nazwa, wartosc)', [],
                        function(tx, results) {
                            //  callback(results.rows.length);
                            console.log('Received dabatase: ' + results.rows.length);
                        });

            });
            /*
             var naz = 'test';
             var war = 'param';
             db.transaction(function(t) {
             t.executeSql('INSERT INTO parametry(nazwa,wartosc) values (?,?)', [naz, war], function(t, data) {
             });
             });
             */

            db.readTransaction(function(t) {

                t.executeSql('SELECT nazwa, wartosc from parametry', [], function(t, data) {
                    parametry_dane = data;
                    for (var i = 0; i < data.rows.length; i++) {

                        App.store.push('param', {
                            nazwa: data.rows.item(i).nazwa,
                            wartosc: data.rows.item(i).wartosc
                        })
                        if (data.rows.item(i).nazwa == 'server') {
                            serv = data.rows.item(i).wartosc;
                        }
                    }
                });
            });
            // phoneGapApp.showDocCount(db, span);
        },
        uruchom_zapytanie: function(zapytanie, callback) {

            db.transaction(function(tx) {

                tx.executeSql(zapytanie, [],
                        function(tx, results) {
                            //console.log(results.rows)
                            callback = results.rows.item;
                        });

            });
        },
        supports_html5_storage: function() {
            try {
                return 'localStorage' in window && window['localStorage'] !== null;
            } catch (e) {
                return false;
            }
        },
        scan: function() {
            cordova.plugins.barcodeScanner.scan(
                    function(result) {
                        alert("Kod\n" +
                                "Text: " + result.text + "\n" +
                                "Format: " + result.format + "\n");
                        // kod = "zeskanowalem: " + result.text;
                    },
                    function(error) {
                        alert("Scanning failed: " + error);
                    }
            )
        },
        prepareDatabase: function() {
            return openDatabase('documents', '1.0', 'Offline document storage', 5 * 1024 * 1024);
            /*
             function (db) {
             db.changeVersion('', '1.0', function (t) {
             t.executeSql('CREATE TABLE docids (id, name)');
             });
             });
             */
        },
        showDocCount: function(db, span) {
            db.readTransaction(function(t) {
                t.executeSql('SELECT COUNT(*) AS c FROM docids', [], function(t, r) {
                    span.textContent = r.rows[0].c;
                    console.log("znalazlem: " + r.rows[0].c);
                }, function(e) {
                    // couldn't read database
                    span.textContent = '(unknown: ' + e.message + ')';
                    console.log(span.textContent);
                });
            });
        }
    }
});
App.Router.map(function() {
    // this.resource('photos');
    this.route("index", {path: "/"});
    this.resource('menu');
    this.resource('rachunki');
    this.resource("papiery", function() {

    });
    this.resource('papier', {path: '/papiery/:papier_id'}, function() {
        this.route('edit');
        this.resource('pozycje', function() {
            this.route('new');
        });
    });
    this.resource('zlecenia');
    this.resource('kasowe');
    this.resource('derywaty');
    this.resource("parametry", {path: '/parametry'},
    function() {
        this.route('new');
    });

    this.route("menu", {path: "/menu"});
});

App.IndexRoute = Ember.Route.extend({
    redirect: function() {

        //  while(!phonegap_initialize) {
        console.log('phonegap_initialize :' + phonegap_initialize);

        //  }
        // App.ApplicationAdapter = App.MyAdapter;
        this.transitionTo('menu');
    }
});

App.ApplicationRoute = Ember.Route.extend({
    model: function() {

    }
});

App.NavView = Ember.View.extend({
    tagName: 'li',
    classNameBindings: ['active'],
    didInsertElement: function() {
        this._super();
        this.notifyPropertyChange('active');
        var _this = this;
        this.get('parentView').on('click', function() {
            _this.notifyPropertyChange('active');
        });
    },
    active: function() {
        return this.get('childViews.firstObject.active');
    }.property()
});

App.ZleceniaRoute = Ember.Route.extend({
    content: [],
    that: this,
    model: function(params) {
        var _this = this;
        // this.controllerFor('zlecenia').set('selected.skrot', 'Wybierz');
        return new Ember.RSVP.Promise(function(resolve) {
            setTimeout(function() {
                resolve(_this.store.findAll("papier"))
            }, 500);

        });
        return this.content;
    },
    actions: {
        view1: [],
        loading: function() {
            this.view1 = this.container.lookup('view:loading').append();
            this.router.one('didTransition', this.view1, 'destroy');
        },
        error: function(reason) {
            console.log('jakis blad' + reason);
            this.view1.destroy();
        }
    }
});

App.ZleceniaController = Ember.ObjectController.extend({
    isKasowe: true,
    selected: [],
    actions: {
        select: function(e) {
            var selected = e;

            this.content.setEach('isActive', false);
            selected.set('isActive', true);
            this.set('selected', selected);
        },
        mBack: function(item) {
            this.transitionToRoute('index');
        },
        mKasowe: function() {
            console.log("loading...");
            this.content.setEach('isActive', false);
            this.set('selected', null);
            this.set('ilosc', null);
            this.set('isKasowe', true);

        },
        mDerywaty: function() {
            console.log("loading...");
            this.content.setEach('isActive', false);
            this.set('selected', null);
            this.set('ilosc', null);
            this.set('isKasowe', false);

        },
        mZlecenieZlozA: function() {
            var ilosc = this.get('ilosc');
            var limit = this.get('limit');
            var gname = this.get('selected.skrot');
            var zlec = this.store.createRecord('izleceniezloz', {
                nazwa: 'Akcje',
                wartosc: ilosc,
                limit: limit,
                skrot: gname
            });
            zlec.save();

        },
        mZlecenieZlozK: function(e) {
            var ilosc = this.get('ilosc');
            var limit = this.get('limit');
            var gname = this.get('selected.skrot');
            var zlec = this.store.createRecord('izleceniezloz', {
                nazwa: 'Kontrakty',
                wartosc: ilosc,
                limit: limit,
                skrot: gname
            });
            zlec.save();

        }
    }
});
App.RachunkiRoute = Ember.Route.extend({
    content: [],
    that: this,
    model: function(params) {
        var _this = this;
        // this.controllerFor('zlecenia').set('selected.skrot', 'Wybierz');
        return new Ember.RSVP.Promise(function(resolve) {
            setTimeout(function() {
                resolve(_this.store.findAll("papier"))
            }, 500);

        });
        return this.content;
    },
    actions: {
        view1: [],
        loading: function() {
            this.view1 = this.container.lookup('view:loading').append();
            this.router.one('didTransition', this.view1, 'destroy');
        },
        error: function(reason) {
            console.log('jakis blad' + reason);
            this.view1.destroy();
        }
    }
});

App.RachunkiController = Ember.ObjectController.extend({
    isKasowe: true,
    selected: [],
    actions: {
        select: function(e) {
            var selected = e;

            this.content.setEach('isActive', false);
            selected.set('isActive', true);
            this.set('selected', selected);
        },
        mBack: function(item) {
            this.transitionToRoute('index');
        },
        mKasowe: function() {
            console.log("loading...");
            this.content.setEach('isActive', false);
            this.set('selected', null);
            this.set('ilosc', null);
            this.set('isKasowe', true);

        },
        mDerywaty: function() {
            console.log("loading...");
            this.content.setEach('isActive', false);
            this.set('selected', null);
            this.set('ilosc', null);
            this.set('isKasowe', false);

        },
        mZlecenieZlozA: function() {
            var ilosc = this.get('ilosc');
            var limit = this.get('limit');
            var gname = this.get('selected.skrot');
            var zlec = this.store.createRecord('izleceniezloz', {
                nazwa: 'Akcje',
                wartosc: ilosc,
                limit: limit,
                skrot: gname
            });
            zlec.save();

        },
        mZlecenieZlozK: function(e) {
            var ilosc = this.get('ilosc');
            var limit = this.get('limit');
            var gname = this.get('selected.skrot');
            var zlec = this.store.createRecord('izleceniezloz', {
                nazwa: 'Kontrakty',
                wartosc: ilosc,
                limit: limit,
                skrot: gname
            });
            zlec.save();

        }
    }
});

App.ParametryIndexRoute = Ember.Route.extend({
    model: function(params) {
        /*   function wartosci(num) {
         if(num.id){
         console.log('there are items: '+num.id);
         }
         console.log('there are items: '+num.id+':'+num[0].id);
         wartosci1 = num;
         };*/
        var wartosci = [];
        var wartosci1 = [];
        var that = this;
        //    phoneGapApp.uruchom_zapytanie("INSERT INTO parametry(nazwa,wartosc) values ('parametr1','200')",wartosci);

        /*
         db.readTransaction(function (t) {

         t.executeSql('SELECT nazwa, wartosc from parametry', [], function (t, data) {
         // console.log("log :"+data.rows.length+":"+data.rows.item);
         for(var i=0;i<data.rows.length;i++){
         wartosci1.addObject(that.store.createRecord('param', {
         nazwa: data.rows.item(i).nazwa,
         wartosc: data.rows.item(i).wartosc
         }));
         }
         });
         });
         */
        // wartosci1 = this.store.all('param');
        // console.log(wartosci1);
        // console.log('storage: '+phoneGapApp.supports_html5_storage()+":"+localStorage["parametry.nazwa"]);
        return this.store.all('param');
    },
    actions: {
        loading: function() {
            console.log("loading...");
            var view = this.container.lookup('view:loading').append();
            this.router.one('didTransition', view, 'destroy');
        }
    }
});


App.ParametryRoute = Ember.Route.extend({
    zaladowane: false,
    model: function(params) {
        var wartosci = [];
        var wartosci1 = [];
        var that = this;

        // if (!this.zaladowane) {
        this.store.unloadAll('param');
        var db = App.phoneGapApp.prepareDatabase();
        db.readTransaction(function(t) {

            t.executeSql('SELECT nazwa, wartosc from parametry', [], function(t, data) {
                var server;
                for (var i = 0; i < data.rows.length; i++) {
                    that.store.createRecord('param', {
                        nazwa: data.rows.item(i).nazwa,
                        wartosc: data.rows.item(i).wartosc
                    });
                    if (data.rows.item(i).nazwa == 'server') {
                        server = data.rows.item(i).wartosc;
                        // server = 'http://10.20.70.27:8084/WebApplication2/test';
                    }
                }
                if (!server) {
                    console.log('Brak parametru server');
                    server = 'http://10.20.80.11:8084/WebApplication2/test';
                }
                App.MyAdapter = DS.RESTAdapter.reopenClass({
                    host: server
                            // host: 'http://10.20.70.43:8084/WebApplication2/test'
                            // 'http://10.20.70.43:8084/WebApplication2/test'
                });

                App.ApplicationAdapter = App.MyAdapter;

                //console.log(data2.get("length") + " dane " + data2.objectAtContent(1).get('nazwa'));
                console.log('zaladowane = true, parametr: ' + server);
            });
        });


        this.zaladowane = true;
        return this.store.all('param');
    },
    actions: {
        loading: function() {
            console.log("loading...");
            var view = this.container.lookup('view:loading').append();
            this.router.one('didTransition', view, 'destroy');
        }
    }
});


App.ParametryNewRoute = Ember.Route.extend({
//content: this.store.createRecord('param'),
    wartosci1: [],
    setupController: function(controller, model) {
        var wartosci1 = [];
        this.controllerFor('parametry').set('isNew', true);
        console.log('jestem wrouterzee:' + this.get('isNew'));
    }
});
App.PapierAdapter = DS.RESTAdapter.extend(
        {
            ajaxError: function(jqXHR) {
                var error = this._super(jqXHR);

                if (jqXHR && jqXHR.status === 422) {
                    var jsonErrors = Ember.$.parseJSON(jqXHR.responseText)["errors"];

                    return new DS.InvalidError(jsonErrors);
                } else {
                    return error;
                }
            },
            buildURL: function(record, suffix)
            {
                // var params = type.params;
                console.log('jestem w adapterze:' + this._super(record) + ':' + this._super(record, suffix));
                if (!serv) {
                    //
                    //
                    var nazwa = this._super(record);
                    serv = 'http://10.20.80.11:8084/WebApplication2/test/papiers';
                    // serv = 'http://10.20.70.22:8084/WebApplication2/test' + this._super(record);
                    console.log('wolam :' + serv);
                    return serv;//"new_url" + record.instance;
                    db.readTransaction(function(t) {

                        t.executeSql('SELECT nazwa, wartosc from parametry', [], function(t, data) {
                            parametry_dane = data;
                            for (var i = 0; i < data.rows.length; i++) {

                                if (data.rows.item(i).nazwa == 'server') {
                                    serv = data.rows.item(i).wartosc + '/items';
                                    //serv = data.rows.item(i).wartosc + nazwa;
                                    console.log('jestem w adapterze:' + serv + ':' + nazwa + ':');
                                    return serv;//"new_url" + record.instance;
                                }
                            }
                        });
                    });
                } else {
                    var rec = 'http://10.20.80.11:8084/WebApplication2/test' + this._super(record, suffix);

                    console.log('wolam :' + rec + ':' + this._super(record, suffix) + ":" + this._super(record, suffix).length);
                    return rec;
                }

            }
        });

App.ParametryController = Ember.ObjectController.extend({
    isNew: false,
    actions: {
        mEdit: function(item) {
            var naz = item.get('nazwa');
            var war = item.get('wartosc');

            // console.log("w morde item :"+naz+":"+war);
            if (!naz) {
                alert("Nazwa nie moze by pusta");
            }
            /*this.store.all('param').then(function(items) {
             console.log(items.get("length") + "cow1");
             });*/

            db.transaction(function(t) {
                t.executeSql('UPDATE parametry SET nazwa=?, wartosc=? where nazwa=?', [naz, war, naz], function(t, data) {
                });
            });
            item.save();
        },
        mDodaj: function(item) {
            this.set('isNew', true);
            this.transitionToRoute('parametry');

        },
        mBack: function(item) {
            this.set('isNew', false);
            this.transitionToRoute('parametry');
        },
        mSave: function(param) {


            var model2 = this.get('param');
            var iK1 = param.get('nazwa');
            var iK2 = param.get('wartosc');
            var naz = this.get('nazwa');
            var war = this.get('wartosc');
            //console.log(iK1 + ":" + iK2 + ":" + war + ":" + param1 + ":" + naz + model1 + ":" + param + ":" + model2);
            if (!naz) {
                alert("Nazwa nie moze by pusta");
            }
            db.transaction(function(t) {
                t.executeSql('INSERT INTO parametry(nazwa,wartosc) values (?,?)', [naz, war], function(t, data) {
                });
            });
            var post = this.store.createRecord('param', {
                nazwa: iK1,
                wartosc: iK2
            });


            var self = this;

            function transitionToPost(post) {
                self.transitionToRoute('parametry', post);
            }


            var onSuccess = function(post) {

                self.transitionToRoute('parametry', post);
                console.log('jest ok');

            };

            var onFail = function(post) {
                self.transitionToRoute('parametry', post);
                console.log('cos sie stalo');

            };
            console.log('jest ok' + this.get('isNew'));
            this.set('isNew', false);
            post.save().then(onSuccess, onFail);


            /*                       that.store.push('param', {
             nazwa: naz,
             wartosc: war
             });*/
            //    this.get("controllers.parametry").set("isNew", false);

            //   this.transitionToRoute('parametry/index');
        },
        mSkan: function(item) {
            App.phoneGapApp.scan();
        },
        mDelete: function(item) {
            var naz = item.get('nazwa');
            var war = item.get('wartosc');

            // console.log("w morde item :"+naz+":"+war);

            db.transaction(function(t) {
                t.executeSql('DELETE FROM parametry where nazwa=? OR nazwa is null', [naz], function(t, data) {
                });
            });
            item.deleteRecord();
            item.save();
        }

    },
    edit: function() {
        this.set('isNew', true);

    },
    doneNew: function() {
        this.set('isNew', false);
        // this.get('store').commit();
    }

});
App.PapierRoute = Ember.Route.extend({
    model: function(params) {
        console.log("params + " + params.papier_id);
        var cos = this.store.find('papier', {login: params.papier_id});
        cos = this.store.all('papier');
        cos = this.store.filter('papier', function(record) {
            return record.get('login') == params.papier_id
        });
        console.log("params + " + params.papier_id + " object:" + cos.get("login") + cos.get("length"));
        return cos;
    },
    actions: {
        loading: function() {
            console.log("loading...");
            var view = this.container.lookup('view:loading').append();
            this.router.one('didTransition', view, 'destroy');
        }
    }
});
App.PapierController = Ember.ObjectController.extend({
    actions: {
        mBack: function(item) {
            this.set('isNew', false);
            this.transitionToRoute('papiery');
        },
        mEdit: function(item) {
            // console.log("item:"+item);
            console.log("item:" + item.get("login"));
            item.save();
            //   var post = this.get('item.login');
            //  console.log("post:"+post);
            //    post.set("login", "Mmmmm");
            //   post.save();
            //  this.store.updateRecord('item', {login: params.papier_id});
        },
        mDelete: function(person) {
            //App.Person.remove(person);
        },
        mSkan: function(item) {
            App.phoneGapApp.scan();
            item.set('komentarz', kod);
        }
    }
});

App.ItemsRoute = Ember.Route.extend({
    model: function(params) {
        return this.store.findAll("item");
    }
});

App.EditRoute = Ember.Route.extend({
    model: function(params) {
        return App.Items.find(1);
    }
});

App.Param = DS.Model.extend({
    nazwa: DS.attr('string'),
    wartosc: DS.attr('string')
});

App.Izleceniezloz = DS.Model.extend({
    nazwa: DS.attr('string'),
    limit: DS.attr('string'),
    wartosc: DS.attr('string'),
    skrot: DS.attr('string')
});


App.Items = DS.Model.extend({
    id: DS.attr('string'),
    komentarz: DS.attr('string'),
    cos: DS.attr('string'),
    class: DS.attr('string'),
    instance: DS.attr('string'),
    newInstance: DS.attr('string'),
    login: DS.attr('string')
});

App.Item = DS.Model.extend({
    komentarz: DS.attr('string'),
    cos: DS.attr('string'),
    class: DS.attr('string'),
    instance: DS.attr('string'),
    newInstance: DS.attr('string'),
    login: DS.attr('string')
});

App.Papiers = DS.Model.extend({
    id: DS.attr('string'),
    komentarz: DS.attr('string'),
    cos: DS.attr('string'),
    class: DS.attr('string'),
    instance: DS.attr('string'),
    newInstance: DS.attr('string'),
    login: DS.attr('string'),
    w_nominalna: DS.attr('number'),
    skrot: DS.attr('string'),
    long_kod_pw: DS.attr('string'),
    typ_papieru: DS.attr('string')
});

App.Papier = DS.Model.extend({
    komentarz: DS.attr('string'),
    cos: DS.attr('string'),
    class: DS.attr('string'),
    instance: DS.attr('string'),
    newInstance: DS.attr('string'),
    login: DS.attr('string'),
    w_nominalna: DS.attr('number'),
    skrot: DS.attr('string'),
    long_kod_pw: DS.attr('string'),
    typ_papieru: DS.attr('string')
});


App.Store = DS.Store.extend({
    revision: 12,
    adapter: "DS.RESTAdapter"
});



App.LoadingView = Ember.View.extend({
    templateName: 'global-loading',
    elementId: 'global-loading'
});

App.PapieryRoute = Ember.Route.extend({
    content: [],
    that: this,
    model: function(params) {
        var _this = this;
        return new Ember.RSVP.Promise(function(resolve) {
            setTimeout(function() {
                resolve(_this.store.findAll("papier"))
            }, 500);

        });
        //return this.content;
    },
    actions: {
        view1: [],
        loading: function() {
            this.view1 = this.container.lookup('view:loading').append();
            this.router.one('didTransition', this.view1, 'destroy');
        },
        error: function(reason) {
            console.log('jakis blad' + reason);
            this.view1.destroy();
            console.log('rozwalio sie');
        }
    }

});

App.PapieryController = Ember.Controller.extend({
    actions: {
        mBack: function(item) {
            this.set('isNew', false);
            this.transitionToRoute('index');
        },
        mAddPapier: function() {
            var post = this.store.createRecord('item', {login: "Nowy", komentarz: "cosik"});
            post.save();
        }
    }
})
