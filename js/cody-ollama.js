// ========================================
// CODY IA - VERSIÓN OLLAMA REAL
// ========================================
console.log('%c🚀 CODY IA - OLLAMA REAL CARGADO', 'color: #00ff00; font-size: 20px; font-weight: bold;');

const CODY_CONFIG = {
    apiEndpoint: '/api/codyChat',
    model: 'llama3.2:3b',
    maxTokens: 800,
    temperature: 0.7
};

let conversationHistory = [];

// Filtro de malas palabras
const BAD_WORDS = [
    'puto', 'puta', 'pendejo', 'pendeja', 'cabron', 'cabrona', 
    'idiota', 'estupido', 'estúpido', 'tonto', 'imbecil', 'imbécil',
    'mierda', 'verga', 'chingada', 'chingar', 'pinche',
    'joder', 'coño', 'carajo', 'maldito', 'maldita',
    'fuck', 'shit', 'bitch', 'asshole', 'damn'
];

function containsBadWords(text) {
    const lowerText = text.toLowerCase();
    return BAD_WORDS.some(word => {
        // Buscar la palabra como palabra completa (no parte de otra palabra)
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerText);
    });
}

// Envío directo a Ollama vía Cloud Function
async function sendToOllama(userMessage) {
    console.log('🔵 sendToOllama llamada con:', userMessage);
    
    // Verificar malas palabras ANTES de enviar
    if (containsBadWords(userMessage)) {
        console.log('⚠️ Mala palabra detectada');
        return '😊 ¡Hey! Usemos palabras amables y respetuosas para poder ayudarte mejor. ¿En qué puedo ayudarte con tu programación?';
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);
        
        console.log('🔵 Enviando a', CODY_CONFIG.apiEndpoint);
        const response = await fetch(CODY_CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                model: CODY_CONFIG.model,
                messages: conversationHistory,
                max_tokens: CODY_CONFIG.maxTokens,
                temperature: CODY_CONFIG.temperature
            })
        });
        
        clearTimeout(timeoutId);
        console.log('🟢 Respuesta recibida, status:', response.status);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        const botMessage = data.content || 'Lo siento, no pude generar respuesta.';
        
        conversationHistory.push({ role: 'assistant', content: botMessage });
        return botMessage;
        
    } catch (error) {
        console.error('❌ Error al comunicarse con Ollama:', error);
        return `❌ Error de conexión con Ollama. Asegúrate de que:\n1. Los emuladores estén corriendo\n2. Ollama esté activo (ollama serve)\n3. El modelo esté cargado\n\nError: ${error.message}`;
    }
}

// Exponer globalmente
window.CODY_OLLAMA = {
    sendMessage: sendToOllama,
    config: CODY_CONFIG,
    history: conversationHistory
};

console.log('✅ Cody Ollama listo. Usa window.CODY_OLLAMA.sendMessage(mensaje)');
