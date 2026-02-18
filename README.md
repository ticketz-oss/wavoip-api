# wavoip-api

Biblioteca JavaScript/TypeScript para integração com WhatsApp Voice over IP (VoIP).

## Instalação

```bash
npm install wavoip/wavoip-api
```

## Uso Básico

### 1. Inicializar a biblioteca

```typescript
import { Wavoip } from '@wavoip/wavoip-api';

const wavoip = new Wavoip({
  tokens: ['seu-token-aqui']
});
```

### 2. Receber uma chamada

```typescript
// Escutar ofertas de chamadas recebidas
wavoip.onOffer(async (callOffer) => {
  console.log('Chamada recebida de:', callOffer.peer);
  
  // Aceitar a chamada
  const { call, err } = await callOffer.accept();
  
  if (err) {
    console.error('Erro ao aceitar:', err);
    return;
  }
  
  console.log('Chamada aceita!');
  
  // Eventos da chamada ativa
  call.onEnd(() => {
    console.log('Chamada encerrada');
  });
});
```

### 3. Fazer uma chamada

```typescript
const { call, err } = await wavoip.startCall({
  to: '5511999999999' // número com código do país
});

if (err) {
  console.error('Erro ao iniciar chamada:', err.message);
  return;
}

console.log('Chamada iniciada!');

// Eventos da chamada
call.onConnected(() => {
  console.log('Chamada conectada');
});

call.onEnd(() => {
  console.log('Chamada encerrada');
});

// Encerrar a chamada
await call.end();
```

### 4. Gerenciar dispositivos de áudio

```typescript
// Listar dispositivos disponíveis
const { microphones, speakers } = wavoip.getMultimediaDevices();

console.log('Microfones:', microphones);
console.log('Alto-falantes:', speakers);

// Selecionar dispositivo específico
await wavoip.multimedia.microphone.selectDevice('device-id');
await wavoip.multimedia.speaker.selectDevice('device-id');
```

## Exemplo Completo

```typescript
import { Wavoip } from '@wavoip/wavoip-api';

const wavoip = new Wavoip({
  tokens: ['seu-token-aqui']
});

// Receber chamadas
wavoip.onOffer(async (callOffer) => {
  console.log(`📞 Chamada de ${callOffer.peer}`);
  
  const { call, err } = await callOffer.accept();
  
  if (call) {
    call.onEnd(() => console.log('Chamada finalizada'));
  }
});

// Fazer uma chamada
async function makeCall(phoneNumber: string) {
  const { call, err } = await wavoip.startCall({ to: phoneNumber });
  
  if (err) {
    console.error('❌ Erro:', err.message);
    return;
  }
  
  console.log('📱 Ligando...');
  
  call.onConnected(() => console.log('✅ Conectado'));
  call.onEnd(() => console.log('👋 Desconectado'));
}

// Fazer uma ligação
makeCall('5511999999999');
```

## Licença

MIT