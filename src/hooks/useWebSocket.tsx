import { useState, useEffect, useRef, useCallback } from 'react';

// Define WebSocket message types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface WebSocketStatusUpdate {
  type: 'status_update';
  status: string;
  message: string;
  data?: any;
  timestamp: string;
}

export interface NodeStatusUpdate {
  type: 'node_status_update';
  node_id: number;
  title: string;
  status: string;
  output_summary?: string;
  timestamp: string;
}

export interface DagStructure {
  type: 'dag_structure';
  nodes: Array<{
    node_id: number;
    title: string;
    description: string;
    assigned_agent: string;
  }>;
  edges: Array<{
    from: number;
    to: number;
  }>;
}

export interface ResearchCompleted {
  type: 'research_completed';
  title: string;
  report_summary: string;
  timestamp: string;
}

// WebSocket connection states
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseWebSocketOptions {
  url: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

const useWebSocket = ({
  url,
  autoConnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  onMessage,
  onStatusChange
}: UseWebSocketOptions) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Buffer for messages when connection is being established
  const pendingMessagesRef = useRef<object[]>([]);
  const hasConnectedOnceRef = useRef(false);
  
  // Update the external status handler
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  // Flush any pending messages after connection is established
  const flushPendingMessages = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN && pendingMessagesRef.current.length > 0) {
      console.log(`Sending ${pendingMessagesRef.current.length} pending messages`);
      pendingMessagesRef.current.forEach(message => {
        websocketRef.current?.send(JSON.stringify(message));
      });
      pendingMessagesRef.current = [];
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    try {
      setStatus('connecting');
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        hasConnectedOnceRef.current = true;
        
        // Send a message to identify this client
        ws.send(JSON.stringify({
          type: 'connect',
          data: { client: 'frontend' }
        }));
        
        // Flush any pending messages
        flushPendingMessages();
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          
          // Call the onMessage callback if provided
          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setStatus('disconnected');
        
        // Attempt to reconnect if not maxed out
        if (reconnectAttemptsRef.current < maxReconnectAttempts || hasConnectedOnceRef.current) {
          console.log(`Reconnecting... (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, reconnectInterval);
        } else {
          console.log('Max reconnect attempts reached');
        }
      };
      
      websocketRef.current = ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setStatus('error');
    }
  }, [url, maxReconnectAttempts, reconnectInterval, onMessage, flushPendingMessages]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setStatus('disconnected');
  }, []);
  
  // Send a message to the WebSocket server
  const sendMessage = useCallback((message: object) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected, queueing message for later');
      // Queue the message to be sent when connection is established
      pendingMessagesRef.current.push(message);
      // Try to connect if not already connecting or connected
      if (status === 'disconnected' || status === 'error') {
        connect();
      }
      return false;
    }
  }, [status, connect]);
  
  // Connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);
  
  return {
    status,
    connect,
    disconnect,
    sendMessage,
    lastMessage,
    isConnected: status === 'connected'
  };
};

export default useWebSocket; 