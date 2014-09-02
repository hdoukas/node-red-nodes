/**
 * Copyright 2014 Matthias Dieter Wallnöfer, TIS innovation park,
 *                                           Bolzano/Bozen - Italy
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

// If you use this as a template, replace IBM Corp. with your own name.

// Sample Node-RED node file

// Require main module
module.exports = function(RED) {
    "use strict";

    var http = require("http");

    // The main node definition - most things happen in here
    function InTeGreenIn(n) {
        // Create a RED node
        RED.nodes.createNode(this,n);
        var node = this;

        // Store local copies of the node configuration (as defined in the .html)
        this.host = n.host;
        this.port = n.port;
        this.frontend = n.frontend;
        this.call = n.call;
        this.params = n.params;

        this.on("input", function(msg) {
            // inherit InTeGreen options from messages
            if (this.frontend == "" && typeof(msg.frontend) == "string") {
                this.frontend = msg.frontend;
            }
            if (this.call == "" && typeof(msg.call) == "string") {
                this.call = msg.call;
            }
            if (this.params == "" && typeof(msg.params) == "string") {
                this.params = msg.params;
            }

            // compute request
            this.req = "/"+this.frontend+"/rest/"+this.call;
            if (this.params != "") {
                this.req += "?"+this.params;
            }

            var post_options = {
                host: this.host,
                port: this.port,
                path: this.req,
                method: "GET"
            };

            var post_req = http.request(post_options, function(res) {
                res.setEncoding("utf8");

                res.on("data", function (chunk) {
                    var msg = {};
                    msg.req = node.req;
                    msg.payload = JSON.parse(chunk);

                    // send out the message to the rest of the workspace.
                    node.send(msg);
                });
            });

            // post the data
            post_req.write("");
            post_req.end();
        });

        this.on("close", function() {
            // Called when the node is shutdown - eg on redeploy.
            // Allows ports to be closed, connections dropped etc.
            // eg: this.client.disconnect();
        });
    }

    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("integreen in",InTeGreenIn);
}
