/**
 * Copyright 2014 Charalampos Doukas, @BuildingIoT
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
module.exports = function(RED) {
    "use strict";

    var http = require('http');
    


     function ServioticyReadNode(n) {
        // Create a RED node
        RED.nodes.createNode(this,n);

        var node = this;
        var credentials = RED.nodes.getCredentials(n.id);

        if ((credentials) && (credentials.hasOwnProperty("auth_token"))) { this.appkey = credentials.auth_token; }
        else { this.error("No auth token set for input node"); }

        //get parameters from user
        this.host = n.host;
        this.port = n.port;
        this.soid = n.soid;
        this.stream = n.stream;
        this.channel = n.channel;

        this.on("input", function(msg){
            // inherit ServIoTicy options from messages
            if (this.soid == "" && typeof(msg.soid) == "string") {
                this.soid = msg.soid;
            }
            if (this.stream == "" && typeof(msg.stream) == "string") {
                this.stream = msg.stream;
            }
            if (this.channel == "" && typeof(msg.channel) == "string") {
                this.channel = msg.channel;
            }

            var post_options = {
                host: this.host,
                port: this.port,
                path: '/'+this.soid+'/streams/'+this.stream+'/lastUpdate',
                method: 'GET',
                headers: {
                    'authorization': ''+this.appkey
                }
            };

            
            var post_req = http.request(post_options, function(res) {
                res.setEncoding('utf8');

                res.on('data', function (chunk) {
                    //console.log('Response: ' + chunk);
                    var channel = this.channel;
                    var result = JSON.parse(chunk);
                    //console.log(chunk);
                    
                    //console.log(result["data"][0]["channels"]);
                    //var name = ''+result["data"][0]["channels"];
                    //console.log(name);
                    var value = result["data"][0]["channels"][node.channel]['current-value'];
                    var lastUpdate = result["data"][0]["lastUpdate"];
                    var msg = {};
                    msg.payload = value;
                    msg.lastUpdate = lastUpdate;
                    node.send(msg);
                });
            });

            // post the data
            post_req.write('');
            post_req.end();

        });

        this.on("close", function() {
        }); 
        
    }

    function ServioticyWriteNode(n) {
        // Create a RED node
        RED.nodes.createNode(this,n);

        var node = this;
        var credentials = RED.nodes.getCredentials(n.id);

        if ((credentials) && (credentials.hasOwnProperty("auth_token"))) { this.appkey = credentials.auth_token; }
        else { this.error("No auth token set for input node"); }

        //get parameters from user
        this.host = n.host;
        this.port = n.port;
        this.soid = n.soid;
        this.stream = n.stream;
        this.channel = n.channel;
        
        this.on("input", function(msg){
            // inherit ServIoTicy options from messages
            if (this.soid == "" && typeof(msg.soid) == "string") {
                this.soid = msg.soid;
            }
            if (this.stream == "" && typeof(msg.stream) == "string") {
                this.stream = msg.stream;
            }
            if (this.channel == "" && typeof(msg.channel) == "string") {
                this.channel = msg.channel;
            }

            // inherit "lastUpdate" from msg if present
            var lastUpdate;
            if (typeof(msg.lastUpdate) != "undefined") {
                lastUpdate = msg.lastUpdate;
            } else {
                lastUpdate = Math.round(new Date().getTime() / 1000);
            }

            var sensor_value = msg.payload;
            var post_data = {
                'channels': {},
                'lastUpdate': lastUpdate
            };
            post_data['channels'][this.channel] = {};
            post_data['channels'][this.channel]['current-value'] = sensor_value;
            post_data = JSON.stringify(post_data);
            // console.log(post_data);

            var post_options = {
                host: this.host,
                port: this.port,
                path: '/'+this.soid+'/streams/'+this.stream,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': ''+this.appkey,
                    'Content-Length': post_data.length
                }
            };

            
            var post_req = http.request(post_options, function(res) {
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    //console.log('Response: ' + chunk);
                    var msg = {};
                    msg.payload = chunk;
                    node.send(msg);
                });
            });

            // post the data
            post_req.write(post_data);
            post_req.end();


        });

        this.on("close", function() {
        });        
    }

    
     //debugging on the output:
    var displayResult = function(result) {
        node.log(result);
    };

    var displayError = function(err) {
        node.log("Error: "+err);
    };

    RED.nodes.registerType("servioticy in",ServioticyReadNode);
    RED.nodes.registerType("servioticy out",ServioticyWriteNode);

    var querystring = require('querystring');

    RED.httpAdmin.get('/servioticy/:id',function(req,res) {
        var credentials = RED.nodes.getCredentials(req.params.id);
        if (credentials) {
            res.send(JSON.stringify({auth_token:credentials.auth_token}));
        } else {
            res.send(JSON.stringify({}));
        }
    });

    RED.httpAdmin.delete('/servioticy/:id',function(req,res) {
        RED.nodes.deleteCredentials(req.params.id);
        res.send(200);
    });

    RED.httpAdmin.post('/servioticy/:id',function(req,res) {
        var body = "";
        req.on('data', function(chunk) {
            body+=chunk;
        });
        req.on('end', function(){
            var newCreds = querystring.parse(body);
            var credentials = RED.nodes.getCredentials(req.params.id)||{};

            if (newCreds.auth_token === null || newCreds.auth_token === "") {
                delete credentials.auth_token;
            } else {
                credentials.auth_token = newCreds.auth_token;
            }
            

            RED.nodes.addCredentials(req.params.id,credentials);
            res.send(200);
        });
    });
}
