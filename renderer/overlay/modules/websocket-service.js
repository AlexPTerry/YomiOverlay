import { updateTextContent } from './text-handler';

export function setupWebSocket(electronAPI) {
    const socket = new WebSocket('ws://localhost:9001');

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
    
    return socket; // Return socket if you need to manage it externally later
}