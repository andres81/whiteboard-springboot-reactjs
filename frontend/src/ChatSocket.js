/*
 * Copyright 2020 André Schepers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import SockJS from "sockjs-client";
import webstomp from "webstomp-client";

export default class ChatSocket {

    constructor(callback, sessionId) {
        this.state = {
            bearerToken : null
            ,reconnecting: false
            ,callback: callback
            ,sessionId: sessionId
        };
        this.startHeartBeat();
    }

    startHeartBeat() {
        this.checkConnection();
        this.state.heartBeat = setInterval(() => {
            this.checkConnection();
        }, 2000);
    }

    checkConnection() {
        console.log("------ Checking connection ------");
        if (!this.state.callback) return;
        if (!this.state.stompClient || !this.state.stompClient.connected) {
            console.log("------ No connection, creating now ------");
            this.state.stompClient = webstomp.over(SockJS("http://localhost:8080/portfolio"), {
                debug: false,
                heartbeat: {incoming: 0, outgoing: 1000},
                protocols: ['v12.stomp']
            });
            this.state.stompClient.connect({}, this.onConnected, this.onError);
        }
    }

    onConnected = function() {
        this.state.reconnecting = false;
        if(this.state.stompClient.connected) {
            this.state.stompClient.subscribe("/topic/"+this.state.sessionId, this.state.callback);
        }
    }.bind(this);

    onError = function(e) {
        console.log("------ Something went wrong with the websocket connection ------");
        this.state.reconnecting = false;
    }.bind(this);

    sendMessage(message) {
        let that = this;
        if (that.state.stompClient && that.state.stompClient.connected) {
            console.error(this.state.sessionId);
            that.state.stompClient.send("/topic/"+this.state.sessionId, JSON.stringify(message));
        }
    }
}