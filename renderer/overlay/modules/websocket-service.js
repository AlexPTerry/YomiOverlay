import { updateTextContent } from './text-handler';

// Needs to be possible to reconnect to websocket
// TODO: Move to backend main process
export function setupWebSocket(electronAPI) {
    const socket = new WebSocket('ws://localhost:9001'); // Port should be manually settable

    socket.onopen = () => {
        console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
        console.log("Message received");
        const messageData = JSON.parse(event.data);
        const sentence = messageData.sentence;
        updateTextContent(sentence); 
        electronAPI.addTextLog(sentence);
    };

    socket.onerror = (error) => {
        console.log('WebSocket Error:', error);
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed');
    };
    
    return socket; 
}