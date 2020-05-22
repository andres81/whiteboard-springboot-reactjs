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

import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import './style.css'
import ChatSocket from "../../ChatSocket";

export default class WhiteBoard extends React.Component {

    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.senderId = uuidv4();
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.canvasContext = null;
        this.state = {
            prevX: 0,
            prevY: 0,
            currX: 0,
            currY: 0,
            isMouseOnPaper: false,
            doErase: false,
            sessionId: "",
            chatSocket : null,
            drawLineWidth: 1,
            drawLineColor: 'black',
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (!prevState.chatSocket && this.state.chatSocket) { // Update canvas once
            const canvas = this.canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            this.canvasContext = canvas.getContext('2d');
            canvas.width = this.canvasWidth = rect.width;
            canvas.height = this.canvasHeight = rect.height;
        }
    }

    sendCanvasUpdate = () => {
        new Promise(() => {
            const canvas = this.canvasRef.current;
            let pngUrl = canvas.toDataURL();
            let updateMessage = {
                url: pngUrl,
                senderId: this.senderId
            };
            this.state.chatSocket.sendMessage(updateMessage);
            return "success";
        }).then(() => {});
    }

    clearCanvas = () => {
        if (!this.canvasContext) return;
        this.canvasContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.sendCanvasUpdate();
    }

    updateReceived = (message) => {
        let m_canvas = document.createElement('canvas');
        m_canvas.width = this.canvasWidth;
        m_canvas.height = this.canvasHeight;
        let m_context = m_canvas.getContext('2d');

        let messageBody = JSON.parse(message.body);
        if (messageBody.senderId === this.senderId) {
            return;
        }

        if (!this.canvasContext) return;
        let img = new Image();
        img.onload = () => {
            m_context.drawImage(img, 0, 0);
            this.canvasContext.clearRect(0,0, this.canvasWidth, this.canvasHeight);
            this.canvasContext.drawImage(m_canvas, 0, 0);
        }
        img.src = messageBody.url.replace(/"/g,"");
    }

    onMouseUp = () => {
        this.setState({
            isMouseOnPaper: false
        });
    }

    onMouseDown = (e) => {
        let newState = this.updateCoords(e);
        newState.prevX = newState.currX;
        newState.prevY = newState.currY;
        newState.isMouseOnPaper = true;
        this.setState(newState);
    }

    onMouseMove = (e) => {
        if (this.state.isMouseOnPaper) {
            let newState = this.updateCoords(e);
            if (this.state.isMouseOut) {
                newState.prevX = newState.currX;
                newState.prevY = newState.currY;
                this.setState({
                    isMouseOut: false
                });
            }
            this.setState(newState);
            this.draw(newState.prevX, newState.prevY, newState.currX, newState.currY);
            this.sendCanvasUpdate();
        }
    }

    onMouseOut = () => {
        this.setState({
            isMouseOut: true
        });
    }

    updateCoords = (e) => {
        const canvas = this.canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        let newCurrX = (e.clientX - rect.left);
        let newCurrY = (e.clientY - rect.top);
        return {
            prevX: this.state.currX,
            prevY: this.state.currY,
            currX: newCurrX,
            currY: newCurrY,
        };
    }

    draw = (prevX, prevY, currX, currY) => {
        let ctx = this.canvasContext;
        if (!ctx) {
            return;
        }
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(currX, currY);
        if (this.state.doErase) {
            ctx.globalCompositeOperation="destination-out";
            ctx.arc(currX,currY,40,0,Math.PI*2,false);
            ctx.fill();
        } else {
            ctx.globalCompositeOperation="source-over";
            ctx.strokeStyle = this.state.drawLineColor;
            ctx.lineWidth = this.state.drawLineWidth;
            ctx.stroke();
        }
        ctx.closePath();
    }

    toggleErasing = () => {
        this.setState({
            doErase: !this.state.doErase
        });
    }

    createOrJoinSession = () => {
        this.setState({
            chatSocket: new ChatSocket(this.updateReceived, this.state.sessionId)
        });
    }

    render() {
        let chatSocket = this.state.chatSocket;
        return (
            <div className="whiteboard-container">
                <h1 className="title">WhiteBoard {this.state.sessionId}</h1>
                <div className={chatSocket ? "canvas-container" : "display-none"}>
                    <h3 className="clear-rect-button" onClick={() => this.clearCanvas()}>Reset whiteboard</h3>
                    <div onClick={this.toggleErasing} className="eraser-checkbox">
                        <input readOnly={true} className="eraser-input" type="checkbox"
                               checked={this.state.doErase}/>
                        <h3>Eraser</h3>
                    </div>
                    <canvas className="canvas"
                        ref={this.canvasRef}
                        onMouseMove={this.onMouseMove}
                        onMouseDown={this.onMouseDown}
                        onMouseUp={this.onMouseUp}
                        onMouseOut={this.onMouseOut}/>
                </div>
                <div className={chatSocket ? "display-none" : undefined}>
                    <br /><br /><br /><br /><br /><br /><br /><br />
                    Enter session id to join or create a session:
                    <br /><br />
                    <input value={this.state.sessionId} onChange={(e) => this.setState({sessionId:e.target.value})}/>
                    &nbsp;&nbsp;&nbsp;
                    <button onClick={() => this.setState({sessionId: uuidv4()})}>New UUID</button>
                    &nbsp;&nbsp;&nbsp;
                    <button onClick={this.createOrJoinSession}>Enter session</button>
                </div>
            </div>
        )
    }
}