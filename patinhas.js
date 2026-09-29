// Arquivo: patinhas.js
let ultimaPatinhaX = 0;
let ultimaPatinhaY = 0;
const distanciaMinima = 50; // Distância em pixels que o mouse precisa andar para soltar outra patinha

document.addEventListener('mousemove', function(e) {
    // Calcula a distância do último lugar onde a patinha apareceu
    const distancia = Math.hypot(e.pageX - ultimaPatinhaX, e.pageY - ultimaPatinhaY);

    if (distancia > distanciaMinima) {
        ultimaPatinhaX = e.pageX;
        ultimaPatinhaY = e.pageY;

        // Cria o elemento da patinha usando o Font Awesome
        const patinha = document.createElement('i');
        patinha.className = 'fa-solid fa-paw paw-print';
        
        // Posiciona a patinha exatamente onde o mouse está
        patinha.style.left = `${e.pageX}px`;
        patinha.style.top = `${e.pageY}px`;

        // Adiciona a patinha no corpo da página
        document.body.appendChild(patinha);

        // Remove o elemento do HTML depois que a animação termina (1 segundo)
        setTimeout(() => {
            patinha.remove();
        }, 1000);
    }
});