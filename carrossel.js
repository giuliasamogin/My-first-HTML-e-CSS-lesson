// ==========================================================================
// CARROSSEL DE BANNERS (SLIDESHOW AUTOMÁTICO) - FLUFFIFY
// ==========================================================================
// Esse arquivo controla só o carrossel de imagens lá no topo da index.html
// (aquele que troca de banner sozinho e também pode ser controlado pelas
// setas). É separado do script.js só por organização — poderia estar tudo
// junto, mas fica mais fácil de achar essa parte assim.

document.addEventListener("DOMContentLoaded", () => {
    // De novo: tudo aqui dentro só roda depois que o HTML da página já
    // carregou por completo.

    const containerSlides = document.querySelector(".carrossel-slides");
    // .querySelector busca o PRIMEIRO elemento que combina com esse
    // seletor — aqui, a div que envolve todos os slides do banner.
    const btnPrev = document.querySelector(".carousel-btn.prev");
    const btnNext = document.querySelector(".carousel-btn.next");
    // Pega os dois botões de seta (anterior/próximo).

    if (!containerSlides) return;
    // Se essa página não tiver carrossel (index.html é a única que tem),
    // o código para por aqui — assim esse arquivo pode ser incluído em
    // outras páginas sem quebrar nada.

    // Seleciona os elementos filhos dos slides (tags <a> ou <img>)
    const slides = Array.from(containerSlides.children);
    // containerSlides.children é a lista de "filhos diretos" dessa div —
    // no caso, cada <a class="clickable-banner-slide"> do banner.
    // Array.from(...) transforma isso numa lista (Array) de verdade do
    // JavaScript, pra podermos usar métodos como .forEach() nela depois.
    if (slides.length === 0) return;
    // Se por algum motivo não tiver nenhum slide dentro, também para aqui.

    let slideAtual = 0;
    // Guarda o ÍNDICE (posição) do slide que está sendo exibido agora.
    // Começa em 0, que é o primeiro slide da lista.
    const tempoTroca = 4000; // 4 segundos
    // Tempo em milissegundos entre uma troca automática e outra
    // (1000 ms = 1 segundo, então 4000 = 4 segundos).
    let timer = null;
    // Vai guardar a referência do "cronômetro" que troca os slides
    // sozinho, pra podermos pausar/reiniciar ele depois.

    function mostrarSlide(index) {
        // Função que decide QUAL slide fica visível, baseado na posição
        // (index) recebida.
        slides.forEach((slide, i) => {
            // Percorre todos os slides. "i" é a posição de cada um dentro
            // do forEach (0, 1, 2, 3...).
            if (i === index) {
                slide.classList.add("ativo");
                // Se a posição atual do loop for igual ao slide que
                // queremos mostrar, adiciona a classe "ativo" nele — e é
                // o CSS quem usa essa classe pra deixar ele visível.
            } else {
                slide.classList.remove("ativo");
                // Todos os outros perdem a classe "ativo" e ficam
                // escondidos.
            }
        });
    }

    function proximoSlide() {
        slideAtual = (slideAtual + 1) % slides.length;
        // O "%" é o operador de "resto da divisão" (módulo). Isso faz o
        // contador voltar pro 0 automaticamente quando passa do último
        // slide — por exemplo, com 5 slides (índices 0 a 4): quando
        // slideAtual chega a 5, "5 % 5" dá 0, voltando pro primeiro slide
        // em vez de tentar mostrar um slide que não existe.
        mostrarSlide(slideAtual);
    }

    function slideAnterior() {
        slideAtual = (slideAtual - 1 + slides.length) % slides.length;
        // Mesma lógica do módulo, mas pra trás: o "+ slides.length" evita
        // que o número fique negativo quando está no primeiro slide e a
        // pessoa clica em "anterior" (ex: querer ir do slide 0 pro -1
        // viraria "voltar pro último slide" em vez de dar erro).
        mostrarSlide(slideAtual);
    }

    function iniciarAutoplay() {
        pararAutoplay();
        // Antes de começar um novo autoplay, garante que não tem outro
        // já rodando (senão os banners trocariam mais rápido do que
        // deveriam, com dois timers ao mesmo tempo).
        timer = setInterval(proximoSlide, tempoTroca);
        // setInterval "agenda" uma função pra rodar repetidamente de tempo
        // em tempo — aqui, chama proximoSlide() a cada 4000ms (4s),
        // criando o efeito de troca automática. Ele guarda esse
        // agendamento dentro da variável "timer" pra podermos cancelar
        // depois.
    }

    function pararAutoplay() {
        if (timer) clearInterval(timer);
        // clearInterval cancela o agendamento criado pelo setInterval,
        // baseado no "código" que foi guardado em "timer".
    }

    // Eventos dos botões
    if (btnNext) {
        btnNext.addEventListener("click", () => {
            proximoSlide();
            iniciarAutoplay(); // Reinicia o tempo ao clicar
            // Reiniciar o autoplay aqui evita que, logo depois de clicar
            // manualmente na seta, o carrossel troque de novo sozinho
            // "cedo demais" (o cronômetro de 4s recomeça do zero).
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener("click", () => {
            slideAnterior();
            iniciarAutoplay(); // Reinicia o tempo ao clicar
        });
    }

    // Inicialização
    mostrarSlide(slideAtual);
    // Mostra o primeiro slide assim que a página carrega.
    iniciarAutoplay();
    // E já liga o autoplay, pra começar a trocar sozinho.
});