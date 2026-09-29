// ==========================================================================
// GERENCIADOR GLOBAL DE CARRINHO, AUTENTICAÇÃO E FORMULÁRIOS - FLUFFIFY
// ==========================================================================
// Esse arquivo é "linkado" (importado) em TODAS as páginas do site através de
// <script src="script.js" defer></script>, no final do <body>.
// "defer" faz esse código só rodar depois que todo o HTML da página já
// carregou, então ele sempre encontra os elementos que precisa manipular.
//
// LEGENDA DAS ANOTAÇÕES DESTA VERSÃO:
//   [CORRIGIDO] = trecho que já existia e foi alterado para consertar um bug.
//   [NOVO]      = trecho que não existia e foi acrescentado.
//   [REMOVIDO]  = trecho que existia e foi retirado (aqui só ficou uma
//                 anotação explicando o que havia ali e por que saiu).
//   [ALTERADO]  = trecho que continua existindo, mas foi ajustado.
// Tudo que não tem essas marcas é exatamente o código original.


// ==========================================================================
// 0. FUNÇÕES AUXILIARES  [NOVO - seção inteira]
// ==========================================================================
// [NOVO] Funções pequenas de apoio, usadas pelas correções mais abaixo.

// [NOVO] escapeHTML: troca caracteres especiais (< > & " ') por versões
// "seguras" antes de colocar um texto digitado pelo usuário dentro de um
// innerHTML. Sem isso, um nome como  Ana "Bia"  quebrava o HTML do cabeçalho
// (e, em um site real, permitiria injetar código malicioso — o chamado XSS).
function escapeHTML(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// [NOVO] parsePreco: converte o preço em número, aceitando tanto número puro
// (1200 ou 1200.50) quanto texto no formato brasileiro ("R$ 1.200,00").
// Antes, o parseFloat("1.200,00") devolvia 1.2 (errado!), porque o JavaScript
// entende o ponto como separador decimal e para de ler na vírgula.
// Observação: se o texto vier como "1.200" (com ponto e SEM vírgula), o código
// não tem como saber se é 1,2 ou mil e duzentos; nesse caso ele lê como 1.2.
// Por isso o ideal é sempre passar o preço como número nos botões (ex: 1200).
function parsePreco(valor) {
    if (typeof valor === 'number') return valor;
    let texto = String(valor).replace(/[^\d.,-]/g, '');
    // Remove "R$", espaços e qualquer coisa que não seja dígito, ponto, vírgula ou sinal.
    if (texto.includes(',')) {
        // Formato brasileiro: tira os pontos de milhar e troca a vírgula por ponto.
        texto = texto.replace(/\./g, '').replace(',', '.');
    }
    const numero = parseFloat(texto);
    return isNaN(numero) ? 0 : numero;
    // Se não deu pra converter, devolve 0 em vez de NaN (que quebraria o total).
}


// ==========================================================================
// 1. GERENCIAMENTO DE CARRINHO (LocalStorage)
// ==========================================================================
// localStorage é uma "gaveta" de armazenamento que o próprio navegador
// oferece: tudo que você guarda ali continua salvo mesmo se a pessoa fechar
// a aba ou o navegador. Como o site é fake (não tem um servidor/banco de
// dados de verdade por trás), o localStorage faz esse papel: guarda o
// carrinho e o usuário logado no computador de quem está usando o site.
// Ele só guarda TEXTO, por isso sempre convertemos os dados (objetos/listas)
// para texto com JSON.stringify() antes de salvar, e de volta pra objeto
// com JSON.parse() quando lemos.

// Obter itens salvos no localStorage
function getCart() {
    const cart = localStorage.getItem('fluffify_cart');
    // localStorage.getItem('fluffify_cart') busca o texto salvo com essa
    // "chave" (nome). Se nunca foi salvo nada, ele retorna null.
    return cart ? JSON.parse(cart) : [];
    // Isso é um "if resumido" (operador ternário): se "cart" existir,
    // transforma o texto de volta em lista (JSON.parse); se não existir,
    // devolve uma lista vazia [] — assim o carrinho nunca "quebra" o site
    // na primeira vez que alguém entra.
}

// Salvar itens no localStorage e atualizar a contagem no badge
function saveCart(cart) {
    localStorage.setItem('fluffify_cart', JSON.stringify(cart));
    // JSON.stringify(cart) transforma a lista de itens em texto, pra poder
    // ser guardada no localStorage.
    updateCartBadge();
    // Toda vez que salvamos o carrinho, já aproveitamos e atualizamos o
    // numerozinho do carrinho no cabeçalho.
}

// Atualizar o número de itens exibido no cabeçalho (badges)
function updateCartBadge() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    // .reduce() percorre a lista de itens do carrinho e vai "somando" um
    // valor, item por item, até sobrar um número só (totalItems).
    // Aqui: começa com "sum" e vai somando a quantidade de cada item
    // (item.quantity); se por algum motivo o item não tiver quantidade
    // definida, soma 1 no lugar (o "|| 1").
    const cartBadges = document.querySelectorAll('.cart-badge');
    // document.querySelectorAll busca TODOS os elementos da página que têm
    // a classe "cart-badge" (o numerozinho vermelho do carrinho, que
    // aparece no cabeçalho — igual em todas as páginas).
    cartBadges.forEach(badge => {
        badge.textContent = totalItems;
        // Pra cada badge encontrado, troca o texto dele pelo total calculado.
    });
}

// Adicionar produto ao carrinho
function addToCart(id, name, price, image) {
    // Essa é a função chamada pelo onclick="addToCart(...)" dos botões
    // "Comprar" nas páginas de produto (ex: index.html, gato-mel.html).
    const cart = getCart();
    const existingItem = cart.find(item => item.id === id);
    // .find() procura na lista se já existe um item com esse mesmo "id".
    // Se encontrar, devolve o item; se não, devolve undefined.

    if (existingItem) {
        existingItem.quantity += 1;
        // Se o produto já está no carrinho, só aumenta a quantidade em 1
        // (evita duplicar a mesma pata/gato como duas linhas diferentes).
    } else {
        cart.push({
            id: id,
            name: name,
            price: parsePreco(price),
            // [CORRIGIDO] Antes era parseFloat(price). Agora usa parsePreco(),
            // que entende tanto número (1200) quanto texto brasileiro
            // ("R$ 1.200,00"), evitando o erro de virar 1.2.
            // (parseFloat converte o preço em número de verdade, pra dar pra
            // somar depois — o parsePreco faz a mesma coisa, só que mais esperto.)
            image: image,
            quantity: 1
        });
        // Se ainda não está no carrinho, cria um novo "objeto" representando
        // o item e adiciona ({} são as chaves e valores desse item) na lista.
    }

    saveCart(cart);
    alert(`${name} foi adicionado ao seu carrinho com sucesso! 🐾`);
    // Isso aqui é uma "template string" (crase ao invés de aspas): permite
    // colocar uma variável dentro do texto usando ${...}, sem precisar
    // ficar concatenando com "+".
}

// Alterar quantidade no carrinho (+1 ou -1)
function updateQuantity(id, delta) {
    // "delta" é a variação: chamado como updateQuantity('id', 1) pra somar
    // ou updateQuantity('id', -1) pra diminuir (vem dos botões "+" e "-"
    // dentro da tabela do carrinho).
    let cart = getCart();
    const item = cart.find(i => i.id === id);

    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== id);
            // .filter() cria uma nova lista mantendo só os itens que NÃO
            // têm esse id — ou seja, remove o item se a quantidade chegar
            // a zero ou menos.
        }
        saveCart(cart);
        renderCartPage();
        // Depois de mudar a quantidade, redesenha a tabela do carrinho na
        // tela pra mostrar o valor atualizado.
    }
}

// Remover item do carrinho
function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    renderCartPage();
}

// Limpar todo o carrinho
function clearCart() {
    localStorage.removeItem('fluffify_cart');
    // Apaga completamente a chave 'fluffify_cart' do localStorage.
    updateCartBadge();
    renderCartPage();
}

// Renderizar a tabela na página carrinho.html
function renderCartPage() {
    // "Renderizar" aqui significa "montar/desenhar na tela". Essa função
    // pega os dados do carrinho (que são só números e texto guardados) e
    // transforma isso em HTML de verdade dentro da página carrinho.html.
    const cartTableBody = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    // document.getElementById busca UM elemento específico pelo id dele.
    // Esses ids só existem na página carrinho.html.

    if (!cartTableBody) return;
    // Se essa página não tiver esse elemento (ou seja, se não formos a
    // página do carrinho), a função para aqui — por isso o mesmo script.js
    // funciona em todas as páginas sem dar erro.

    const cart = getCart();

    if (cart.length === 0) {
        cartTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #777;">
                    Seu carrinho está vazio no momento. <br><br>
                    <a href="index.html" class="btn btn-secondary" style="display: inline-block; width: auto; text-decoration: none;">Ver Filhotes</a>
                </td>
            </tr>
        `;
        // .innerHTML permite injetar um bloco de HTML inteiro dentro de um
        // elemento. Aqui, se o carrinho estiver vazio, mostramos uma linha
        // de aviso em vez da tabela de produtos.
        if (subtotalEl) subtotalEl.textContent = 'R$ 0,00';
        if (totalEl) totalEl.textContent = 'R$ 0,00';
        return;
    }

    cartTableBody.innerHTML = '';
    // Limpa o conteúdo atual da tabela antes de redesenhar do zero (evita
    // duplicar linhas toda vez que a função roda de novo).
    let total = 0;

    cart.forEach(item => {
        // .forEach() percorre cada item do carrinho, um por um.
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        // Vai somando o total geral do carrinho conforme percorre os itens.

        const row = document.createElement('tr');
        // Cria uma nova linha de tabela (<tr>) "na memória", ainda sem
        // estar visível na página.
        row.innerHTML = `
            <td>
                <div class="cart-item-info" style="display: flex; align-items: center; gap: 10px;">
                    <img src="${item.image}" alt="${escapeHTML(item.name)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                    <span><strong>${escapeHTML(item.name)}</strong></span>
                </div>
            </td>
            <td>R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>
                <div class="qty-controls" style="display: flex; align-items: center; gap: 8px;">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            </td>
            <td><strong>R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            <td>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')" title="Remover item"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        // [CORRIGIDO] No nome do produto e no alt da imagem, agora usamos
        // escapeHTML(item.name) em vez de item.name puro, pra um nome com aspas
        // ou símbolos não quebrar a linha da tabela.
        // .toLocaleString('pt-BR', {...}) formata o número como dinheiro
        // brasileiro (ex: 1200 vira "1.200,00").
        cartTableBody.appendChild(row);
        // .appendChild() é o que efetivamente "planta" essa linha criada
        // dentro da tabela, fazendo ela aparecer na tela.
    });

    const formattedTotal = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (subtotalEl) subtotalEl.textContent = formattedTotal;
    if (totalEl) totalEl.textContent = formattedTotal;
}

// Finalização de compra simulada
function handleCheckout() {
    const cart = getCart();
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }
    // [NOVO] Dispara a chuva de patinhas aqui dentro (só quando existe algo
    // no carrinho). Antes, o botão do carrinho.html chamava a chuva de
    // patinhas direto e NÃO chamava o handleCheckout, então os itens nunca
    // eram removidos depois da "compra". Agora o handleCheckout faz tudo:
    // confete + mensagem + limpar o carrinho.
    // (window.dispararChuvaDePatinhas é definida lá no final deste arquivo;
    // o "if" evita erro caso ela não exista por algum motivo.)
    if (typeof window.dispararChuvaDePatinhas === 'function') {
        window.dispararChuvaDePatinhas();
    }
    alert('Simulação de compra realizada com sucesso! Obrigado por adquirir seu filhote no Fluffify. 🐶🐱');
    clearCart();
}

// ==========================================================================
// 2. GERENCIAMENTO DE AUTENTICAÇÃO (LOGIN / CADASTRO / LOGOUT)
// ==========================================================================
// Assim como o carrinho, o "usuário logado" também é só simulado: fica
// guardado no localStorage como 'fluffify_user'. Não existe senha sendo
// checada de verdade em lugar nenhum — é só pra dar a aparência de login.

// Gerenciamento Elegante do Status de Usuário Logado no Cabeçalho
function checkLoginStatus() {
    const userJson = localStorage.getItem('fluffify_user');
    const containers = document.querySelectorAll('.user-actions');
    // Pega a div .user-actions (onde ficam os links Carrinho/Entrar) de
    // TODAS as páginas — mesmo rodando uma vez só, esse forEach cobre o
    // caso de existir mais de uma na mesma página.

    if (!containers.length) return;

    containers.forEach(container => {
        if (userJson) {
            // Se existir um usuário salvo no localStorage, a pessoa está
            // "logada" — então trocamos o link "Entrar" por uma saudação +
            // botão de sair em qualquer página do site.
            try {
                const user = JSON.parse(userJson);
                const nomeExibicao = user.nome ? user.nome.split(' ')[0] : 'Usuário';
                // .split(' ')[0] separa o nome completo pelos espaços e pega só
                // a primeira palavra (o primeiro nome), pra não lotar o
                // cabeçalho com o nome inteiro.

                const userBadge = document.createElement('div');
                userBadge.className = 'user-logged-badge';
                userBadge.innerHTML = `
                    <span class="user-greeting" title="${escapeHTML(user.nome || '')}" style="margin-right: 10px; font-weight: bold;">
                        <i class="fa-solid fa-circle-user"></i> ${escapeHTML(nomeExibicao)}
                    </span>
                    <button onclick="logoutUser(event)" class="btn-logout-link" title="Sair da conta" style="cursor: pointer; background: none; border: none; color: inherit;">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i> Sair
                    </button>
                `;
                // Monta, na memória, um novo bloco de HTML com a saudação e o
                // botão de sair.
                // [CORRIGIDO] O nome agora passa por escapeHTML(), então aspas
                // ou símbolos no nome não quebram mais o cabeçalho.

                // [CORRIGIDO - ESTE É O BUG PRINCIPAL DO CARRINHO SUMINDO]
                // Antes era:
                //     container.innerHTML = '';
                //     container.appendChild(userBadge);
                // O innerHTML = '' apagava TUDO que existia dentro de
                // .user-actions — e o link do carrinho (com o badge do número)
                // fica DENTRO dessa mesma div, então ele era apagado junto com o
                // link "Entrar". Por isso, depois de logar/cadastrar, o carrinho
                // sumia do cabeçalho (os produtos continuavam salvos no
                // localStorage, só o ícone clicável desaparecia).
                // Agora removemos APENAS o link "Entrar" e mantemos o carrinho.
                const loginLink = container.querySelector('a[href="login.html"]');
                if (loginLink) loginLink.remove();
                container.appendChild(userBadge);
            } catch (e) {
                console.error("Erro ao processar usuário:", e);
            }
        }
    });
}

// Função de Logout
function logoutUser(event) {
    if (event) event.preventDefault();
    localStorage.removeItem('fluffify_user');
    alert('Você saiu da sua conta.');
    window.location.reload();
    // window.location.reload() recarrega a página inteira, o que faz o
    // cabeçalho voltar a mostrar "Entrar" (já que checkLoginStatus roda de
    // novo do zero e agora não encontra mais o usuário salvo).
}

// Função de Processar Login (Chamada em login.html)
function handleLogin(event) {
    if (event) event.preventDefault();
    // Impede o comportamento padrão do formulário (recarregar a página),
    // pra podermos controlar manualmente o que acontece ao "logar".

    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');

    if (emailInput && senhaInput) {
        const email = emailInput.value.trim();
        const senha = senhaInput.value.trim();
        // .value pega o texto que a pessoa digitou dentro do campo.

        if (email && senha) {
            // Só segue se os dois campos tiverem algo digitado.
            const existingUser = localStorage.getItem('fluffify_user');
            let userName = email.split('@')[0];
            // Nome "padrão": tudo que vem antes do @ no e-mail.

            // [NOVO] Guarda os dados antigos do cadastro (ex: telefone) quando
            // o e-mail for o mesmo, pra o login não apagá-los.
            let dadosAntigos = {};

            if (existingUser) {
                try {
                    const parsed = JSON.parse(existingUser);
                    if (parsed.email === email && parsed.nome) {
                        userName = parsed.nome;
                        // Se esse e-mail já tinha feito cadastro antes (com nome
                        // salvo), usa o nome real em vez do "apelido" do e-mail.
                        dadosAntigos = parsed;
                        // [NOVO] Guarda todos os dados do cadastro anterior.
                    }
                } catch (e) {}
            }

            const usuario = {
                ...dadosAntigos,
                // [CORRIGIDO] O "...dadosAntigos" copia primeiro tudo que já
                // estava salvo (nome, e-mail, telefone). Antes, o login
                // regravava só nome e e-mail e o telefone do cadastro se perdia.
                nome: userName,
                email: email
            };

            localStorage.setItem('fluffify_user', JSON.stringify(usuario));
            alert(`Login efetuado com sucesso! Bem-vindo(a) de volta, ${userName}. 🐾`);
            window.location.href = 'index.html';
            // window.location.href muda a página atual — aqui, redireciona
            // pra home depois do "login".
        } else {
            alert('Por favor, preencha e-mail e senha.');
        }
    }
}

// Função de Processar Cadastro (Chamada em cadastro.html)
function handleRegister(event) {
    if (event) event.preventDefault();

    const nome = document.getElementById('nome') ? document.getElementById('nome').value.trim() : '';
    const email = document.getElementById('email') ? document.getElementById('email').value.trim() : '';
    const telefone = document.getElementById('telefone') ? document.getElementById('telefone').value.trim() : '';
    const senha = document.getElementById('senha') ? document.getElementById('senha').value : '';
    const confirmarSenha = document.getElementById('confirmarSenha') ? document.getElementById('confirmarSenha').value : '';
    const termosAceitos = document.getElementById('termos') ? document.getElementById('termos').checked : true;
    // Cada linha usa "se o campo existir, pega o valor; senão, string
    // vazia" — isso deixa a função "segura" mesmo que algum campo não
    // exista na página de cadastro. .checked é usado especificamente pra
    // checkbox (a caixinha de aceitar os termos): retorna true/false.

    if (!termosAceitos) {
        alert('Você precisa aceitar os Termos de Uso e a Política de Privacidade para se cadastrar.');
        return;
        // "return" sozinho aqui interrompe a função na hora, sem continuar
        // o cadastro, se os termos não foram aceitos.
    }

    if (telefone && telefone.replace(/\D/g, '').length < 10) {
        alert('Por favor, informe um número de telefone celular válido com DDD.');
        return;
        // telefone.replace(/\D/g, '') remove tudo que NÃO é dígito (o "\D"
        // no meio dessa expressão regular significa "não-dígito"), sobrando
        // só os números, pra poder contar quantos dígitos têm de verdade.
    }

    if (senha !== confirmarSenha) {
        alert('As senhas não coincidem. Por favor, verifique e tente novamente.');
        return;
    }

    const usuario = {
        nome: nome,
        email: email,
        telefone: telefone
    };

    localStorage.setItem('fluffify_user', JSON.stringify(usuario));
    // (Isso só mexe na chave 'fluffify_user'. O carrinho fica em
    // 'fluffify_cart', então o cadastro nunca apaga os produtos.)

    alert(`Cadastro realizado com sucesso, ${nome}! Seja bem-vindo(a) à Fluffify. 🐾`);
    window.location.href = 'index.html';
}

// MÁSCARA AUTOMÁTICA DE TELEFONE BRASILEIRO (11) 98765-4321
function setupPhoneMask() {
    // "Máscara" é o nome dado a esse tipo de formatação automática que vai
    // adicionando parênteses e traço enquanto a pessoa digita o telefone.
    const phoneInput = document.getElementById('telefone');
    if (!phoneInput) return;
    // Se a página não tiver campo de telefone, a função não faz nada.

    phoneInput.addEventListener('input', (e) => {
        // .addEventListener('input', ...) roda essa função TODA VEZ que o
        // valor do campo muda (ou seja, a cada tecla digitada).
        let value = e.target.value.replace(/\D/g, ''); // Apenas números
        // e.target é o próprio campo de telefone; de novo removemos tudo
        // que não é número, pra trabalhar só com os dígitos puros.

        if (value.length > 11) {
            value = value.slice(0, 11); // Limite de 11 dígitos
            // .slice(0, 11) corta a string, mantendo só os 11 primeiros
            // caracteres (DDD + 9 dígitos do celular).
        }

        if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        } else if (value.length > 6) {
            value = value.replace(/^(\d{2})(\d{4,5})(\d{0,4})$/, '($1) $2-$3');
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
        } else if (value.length > 0) {
            value = value.replace(/^(\d*)$/, '($1');
        }
        // Cada uma dessas linhas usa uma "expressão regular" (aquele
        // padrão entre barras /.../) pra separar os dígitos em grupos —
        // DDD, primeira parte do número, segunda parte — e reorganizar
        // com parênteses e traço no meio, dependendo de quantos números já
        // foram digitados até agora.

        e.target.value = value;
        // No final, atualiza o campo na tela com o valor já formatado.
    });
}

// ==========================================================================
// 3. GERENCIAMENTO DO FORMULÁRIO FALE CONOSCO
// ==========================================================================

function handleContact(event) {
    if (event) event.preventDefault();

    const nome = document.getElementById('nome') ? document.getElementById('nome').value : '';
    const email = document.getElementById('email') ? document.getElementById('email').value : '';
    const mensagem = document.getElementById('mensagem') ? document.getElementById('mensagem').value : '';

    if (nome && email && mensagem) {
        alert(`Obrigado pelo contato, ${nome}! Sua mensagem foi enviada com sucesso. Responderemos em breve no e-mail ${email}. 🐾`);
        const form = document.getElementById('form-contato');
        if (form) form.reset();
        // .reset() limpa todos os campos do formulário, deixando pronto
        // pra um novo preenchimento.
    } else {
        alert('Por favor, preencha todos os campos obrigatórios.');
    }
}
// Observação: essa função espera ids "nome", "email", "mensagem" e o
// formulário com id "form-contato" — repare que são ids diferentes dos
// usados no contato.html que te comentei antes (que não tinha ids nos
// inputs). Isso é algo bom de revisar/ajustar antes da apresentação, se
// quiser que esse formulário específico funcione de verdade com JS.
// [ANOTAÇÃO] Confira no seu contato.html se o <form> tem id="form-contato"
// e se os campos têm id="nome", id="email" e id="mensagem". Se não tiverem,
// o formulário de contato não vai funcionar (isso é no HTML, não neste arquivo).

// ==========================================================================
// 4. INICIALIZAÇÃO E EVENTOS AUTOMÁTICOS
// ==========================================================================
// Esse bloco final é o "ponto de partida" do arquivo: tudo dentro dele só
// roda depois que a página termina de carregar (DOMContentLoaded = "o
// documento HTML terminou de ser montado").

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    renderCartPage();
    checkLoginStatus();
    setupPhoneMask();
    // Essas 4 funções rodam automaticamente assim que QUALQUER página do
    // site carrega — é por isso que o número do carrinho e o status de
    // login já aparecem certos assim que a página abre, sem precisar
    // clicar em nada.
    // (A ordem importa: o updateCartBadge roda ANTES do checkLoginStatus,
    // mas como agora o carrinho não é mais apagado do cabeçalho, o número
    // continua aparecendo depois que o checkLoginStatus termina.)

    // Event listener dinâmico para o formulário de Fale Conosco
    const contactForm = document.getElementById('form-contato');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContact);
        // "Event listener" = "ouvinte de evento": aqui, ele fica "ouvindo"
        // o formulário e, quando alguém aperta o botão de enviar (evento
        // "submit"), chama a função handleContact.
    }

    // Event listener dinâmico para o formulário de Login (se usá-lo com submit comum)
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Event listener dinâmico para o formulário de Cadastro (se usá-lo com submit comum)
    const registerForm = document.getElementById('form-cadastro');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});


// ==========================================
// EFEITO DE CORAÇÃO/PATINHA AO CLICAR NA TELA
// ==========================================
document.addEventListener('click', function(e) {
    // Cria um elemento de span para o ícone
    const elemento = document.createElement('span');
    
    // Escolhe aleatoriamente entre uma patinha ou um coração
    const icones = ['fa-paw', 'fa-heart', 'fa-bone'];
    const iconeEscolhido = icones[Math.floor(Math.random() * icones.length)];
    
    elemento.className = `fa-solid ${iconeEscolhido} click-animation-item`;
    
    // Posiciona o item exatamente onde o usuário clicou
    elemento.style.left = `${e.pageX}px`;
    elemento.style.top = `${e.pageY}px`;
    
    // Cores pastel aleatórias para dar vida
    const coresPastel = ['#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea'];
    elemento.style.color = coresPastel[Math.floor(Math.random() * coresPastel.length)];
    
    // Adiciona na tela
    document.body.appendChild(elemento);
    
    // Remove o elemento após a animação terminar (1 segundo)
    setTimeout(() => {
        elemento.remove();
    }, 1000);
});



// ==========================================
// TRILHA DE PEGADAS CAMINHANDO SOZINHAS
// ==========================================
function criarTrilhaDePegadas() {
    // Ponto de partida aleatório na tela
    let posX = Math.random() * (window.innerWidth - 200) + 100;
    let posY = Math.random() * (window.innerHeight - 200) + 100;
    
    // Escolhe uma direção aleatória para o pet andar (ângulo em radianos)
    let angulo = Math.random() * Math.PI * 2;
    
    // Número de passos que ele vai dar nessa caminhada
    const totalPassos = 8 + Math.floor(Math.random() * 6); 
    let passoAtual = 0;

    const intervaloPassos = setInterval(() => {
        if (passoAtual >= totalPassos) {
            clearInterval(intervaloPassos);
            return;
        }

        const patinha = document.createElement('i');
        patinha.className = 'fa-solid fa-paw trail-paw';

        // Alterna levemente para a esquerda e para a direita simulando o balanço do corpo ao andar
        const deslocamentoLateral = (passoAtual % 2 === 0 ? 1 : -1) * 12;
        
        // Posição ajustada com base no ângulo de caminhar
        const xFinal = posX + Math.cos(angulo) * (passoAtual * 25) + Math.sin(angulo) * deslocamentoLateral;
        const yFinal = posY + Math.sin(angulo) * (passoAtual * 25) - Math.cos(angulo) * deslocamentoLateral;

        patinha.style.left = `${xFinal}px`;
        patinha.style.top = `${yFinal + window.scrollY}px`; // Considera o scroll da página

        // Rotaciona a patinha levemente na direção em que o pet está andando
        const rotacaoGraus = (angulo * 180) / Math.PI + 90;
        patinha.style.transform = `rotate(${rotacaoGraus}deg)`;

        document.body.appendChild(patinha);

        // Remove a patinha da tela depois que a animação termina (4 segundos)
        setTimeout(() => {
            patinha.remove();
        }, 4000);

        passoAtual++;
    }, 400); // Velocidade entre um passo e outro (400 milissegundos)
}

// Inicia a primeira caminhada logo após carregar e repete a cada 7 segundos em um lugar novo
setTimeout(criarTrilhaDePegadas, 1000);
setInterval(criarTrilhaDePegadas, 7000);



// ==========================================
// ASSISTENTE DE DICAS FOFAS DO DIA (GLOBAL)
// ==========================================
(function() {
    // 1. Cria o HTML do botão flutuante e da caixinha de dicas
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="pet-assistant" style="position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: inherit;">
            <!-- Balão de Dica -->
            <div id="pet-speech-bubble" style="display: none; position: absolute; bottom: 70px; right: 0; background: #fff; padding: 12px 16px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); width: 220px; font-size: 14px; color: #444; border: 2px solid #ffb7b2;">
                <p id="pet-tip-text" style="margin: 0; line-height: 1.4;"></p>
                <div style="position: absolute; bottom: -8px; right: 20px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid #ffb7b2;"></div>
            </div>
            <!-- Botão Flutuante com a Patinha -->
            <button id="pet-float-btn" style="background: #ffb7b2; color: white; border: none; width: 55px; height: 55px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; transition: transform 0.2s;">
                <i class="fa-solid fa-paw"></i>
            </button>
        </div>
    `;
    document.body.appendChild(container);

    // 2. Lista de dicas fofas
    const dicas = [
        "🐾 Dica: Filhotes de cães precisam brincar pelo menos 30 minutos por dia para gastar energia!",
        "🐱 Sabia que os gatinhos ronronam não só quando estão felizes, mas também quando estão se curando?",
        "🐰 Coelhinhos adoram feno fresco e precisam roer coisas para desgastar os dentes que crescem sempre!",
        "🦜 Aves são pets super sociais e adoram cantar junto com a música da casa!",
        "✨ Filhotes dormem até 18 horas por dia para conseguir crescer fortes e saudáveis!"
    ];

    // 3. Lógica de clique para abrir/mudar a dica
    const btn = document.getElementById('pet-float-btn');
    const bubble = document.getElementById('pet-speech-bubble');
    const tipText = document.getElementById('pet-tip-text');
    let isOpen = false;

    btn.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
            // Sorteia uma dica aleatória
            const dicaAleatoria = dicas[Math.floor(Math.random() * dicas.length)];
            tipText.textContent = dicaAleatoria;
            bubble.style.display = 'block';
            btn.style.transform = 'scale(1.1) rotate(15deg)';
        } else {
            bubble.style.display = 'none';
            btn.style.transform = 'scale(1)';
        }
    });
})();

// ==========================================
// BOTÃO "VOLTAR AO TOPO" (GLOBAL)
// ==========================================
(function() {
    // 1. Cria o botão dinamicamente e insere na página
    const btnTopo = document.createElement('button');
    btnTopo.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    btnTopo.id = 'btn-voltar-topo';
    
    // Estilos inline para garantir que funcione perfeitamente sem mexer no CSS
    Object.assign(btnTopo.style, {
        position: 'fixed',
        bottom: '90px', // Fica logo acima do botão de dicas (se você estiver usando)
        right: '20px',
        width: '45px',
        height: '45px',
        borderRadius: '50%',
        backgroundColor: '#ffb7b2', // Cor pastel combinando com o tema
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '99998',
        opacity: '0',
        visibility: 'hidden',
        transition: 'opacity 0.3s, visibility 0.3s, transform 0.2s'
    });

    document.body.appendChild(btnTopo);

    // Efeito de hover no botão
    btnTopo.addEventListener('mouseenter', () => {
        btnTopo.style.transform = 'scale(1.1)';
    });
    btnTopo.addEventListener('mouseleave', () => {
        btnTopo.style.transform = 'scale(1)';
    });

    // 2. Mostra ou esconde o botão dependendo do scroll da página
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btnTopo.style.opacity = '1';
            btnTopo.style.visibility = 'visible';
        } else {
            btnTopo.style.opacity = '0';
            btnTopo.style.visibility = 'hidden';
        }
    });

    // 3. Ao clicar, rola a página suavemente para o topo
    btnTopo.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
})();

// ==========================================================================
// 5. SISTEMA DE "ALERTA DE ADOÇÃO RECENTE" (NOTIFICAÇÃO TOAST)
// ==========================================================================
// [CORRIGIDO] Este título estava numerado como "1." (repetido com a seção do
// carrinho). Renumerei as seções para ficarem em ordem: 0, 1, 2, 3, 4, 5, 6.
(function() {
    // Cria o estilo da caixinha de notificação dinamicamente via JS
    const style = document.createElement('style');
    style.innerHTML = `
        #adoption-toast {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #ffffff;
            color: #333;
            padding: 12px 18px;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
            border-left: 5px solid #ffb7b2;
            font-family: inherit;
            font-size: 13px;
            z-index: 99997;
            display: flex;
            align-items: center;
            gap: 12px;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.4s ease, transform 0.4s ease;
            pointer-events: none;
        }
        #adoption-toast i {
            font-size: 20px;
            color: #ffb7b2;
        }
        #adoption-toast.show {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);

    // Cria o elemento HTML do toast e insere no body
    const toast = document.createElement('div');
    toast.id = 'adoption-toast';
    toast.innerHTML = `<i class="fa-solid fa-paw"></i><div><strong id="toast-name">Nome</strong> <span id="toast-action">adotou um pet!</span></div>`;
    document.body.appendChild(toast);

    // Dados fictícios para simular adoções
    const nomesAdotantes = [
        "Mariana S. (São Paulo)", "Carlos R. (Campinas)", "Beatriz L. (Santos)", 
        "Lucas M. (Sorocaba)", "Camila P. (Jundiaí)", "Gabriel T. (Rio de Janeiro)", 
        "Juliana K. (Curitiba)", "Rafael B. (Belo Horizonte)"
    ];
    const petsAdotados = [
        "o Gatinho Mel 🐱", "o Cachorrinho Bidu 🐶", "o Patinho Mandarim 🦆", 
        "o Coelhinho Fofinho 🐰", "um filhote surpresa 🐾"
    ];

    function dispararNotificacaoAdocao() {
        const nomeAleatorio = nomesAdotantes[Math.floor(Math.random() * nomesAdotantes.length)];
        const petAleatorio = petsAdotados[Math.floor(Math.random() * petsAdotados.length)];

        document.getElementById('toast-name').textContent = nomeAleatorio;
        document.getElementById('toast-action').innerHTML = `acabou de adotar <strong>${petAleatorio}</strong>!`;

        // Mostra a notificação
        toast.classList.add('show');

        // Esconde após 4 segundos
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    // Dispara a primeira notificação após 8 segundos de site aberto, e repete a cada 20 segundos
    setTimeout(dispararNotificacaoAdocao, 8000);
    setInterval(dispararNotificacaoAdocao, 20000);
})();


// ==========================================================================
// 6. CHUVA DE CONFETE DE PATINHAS AO FINALIZAR COMPRA
// ==========================================================================
// [CORRIGIDO] Este título estava numerado como "4." (repetido com a seção de
// inicialização). Agora é a seção 6.
// Função global para ser chamada quando a compra for finalizada
// [ANOTAÇÃO] Agora quem chama esta função é o handleCheckout() (seção 1).
window.dispararChuvaDePatinhas = function() {
    // Cria estilo para os confetes caindo
    const styleConfete = document.createElement('style');
    styleConfete.innerHTML = `
        .confetti-paw {
            position: fixed;
            top: -30px;
            font-size: 20px;
            pointer-events: none;
            z-index: 999999;
            animation: cairConfete linear forwards;
        }
        @keyframes cairConfete {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(105vh) rotate(360deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(styleConfete);

    // Cores pastel fofas para os confetes
    const cores = ['#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea', '#ff9aa2'];
    const icones = ['fa-paw', 'fa-heart', 'fa-bone'];

    // Gera 45 ícones caindo simultaneamente
    for (let i = 0; i < 45; i++) {
        setTimeout(() => {
            const confete = document.createElement('i');
            const iconeAleatorio = icones[Math.floor(Math.random() * icones.length)];
            confete.className = `fa-solid ${iconeAleatorio} confetti-paw`;
            
            // Posição horizontal aleatória na tela
            confete.style.left = `${Math.random() * window.innerWidth}px`;
            
            // Cor aleatória
            confete.style.color = cores[Math.floor(Math.random() * cores.length)];
            
            // Tamanho e velocidade variados
            const tamanho = Math.floor(Math.random() * 15) + 15; // de 15px a 30px
            confete.style.fontSize = `${tamanho}px`;
            
            const duracao = Math.random() * 2 + 2; // de 2s a 4s
            confete.style.animationDuration = `${duracao}s`;

            document.body.appendChild(confete);

            // Remove o elemento após cair
            setTimeout(() => {
                confete.remove();
            }, duracao * 1000);
        }, i * 60); // Intervalo de criação em cascata
    }
};


// ==========================================================================
// 7. EXTRAS DO SITE  [NOVO - bloco inteiro]
// ==========================================================================
// COLE ESTE BLOCO NO FIM DO SEU script.js (depois da seção 6).
// Ele usa funções que já existem no script.js corrigido: getCart, saveCart,
// clearCart, parsePreco, escapeHTML e dispararChuvaDePatinhas.
//
// O que este bloco faz:
//   1) Toast (notificação bonita) no lugar do alert ao adicionar ao carrinho
//   2) Número do carrinho "pula" quando aumenta
//   3) Favoritos (coração nos cards + janelinha "Meus favoritos")
//   4) Busca e ordenação nas páginas de categoria
//   5) Cupom de desconto no carrinho
//   6) Frete simulado por CEP (usa a API gratuita ViaCEP)
//   7) Modo escuro
//   8) Quiz "Qual pet combina com você?"
//   9) [REMOVIDO] Selo de estoque nos cards (e limite de quantidade).
//      Foi retirado porque cada animal é único, então não faz sentido ter
//      "estoque". Repare que a numeração continua 10, 11 (não renumerei de
//      propósito, pra os números dos comentários abaixo continuarem batendo).
//  10) Avaliação por estrelas na página do animal
//  11) Histórico "Meus pedidos"
//
// Tudo fica dentro de uma função ( function () { ... } )(); para as variáveis
// daqui não se misturarem com as do resto do script.
(function () {
    'use strict';
    // 'use strict' deixa o JavaScript mais rigoroso e avisa erros bobos.

    // ----------------------------------------------------------------------
    // CONFIGURAÇÕES (pode mexer à vontade)
    // ----------------------------------------------------------------------
    // Cupons: "CÓDIGO": porcentagem de desconto (0.10 = 10%).
    const CUPONS = { 'FLUFFY10': 0.10, 'BEMVINDO5': 0.05 };

    // Compras com subtotal igual ou maior que esse valor têm frete grátis.
    const FRETE_GRATIS_ACIMA = 1500;

    // Páginas onde a barra de busca NÃO aparece.
    const PAGINAS_SEM_BUSCA = ['index.html', 'carrinho.html', 'login.html', 'cadastro.html', 'contato.html'];

    // ----------------------------------------------------------------------
    // FUNÇÕES AUXILIARES
    // ----------------------------------------------------------------------
    // Formata número como dinheiro brasileiro: 1200 vira "R$ 1.200,00".
    function brl(n) {
        return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Lê do localStorage e converte de texto para objeto/lista.
    // Se não existir ou der erro, devolve o valor "padrao".
    function lerJSON(chave, padrao) {
        try {
            const texto = localStorage.getItem(chave);
            return texto ? JSON.parse(texto) : padrao;
        } catch (e) {
            return padrao;
        }
    }

    // Converte para texto e salva no localStorage.
    function salvarJSON(chave, valor) {
        try {
            localStorage.setItem(chave, JSON.stringify(valor));
        } catch (e) {
            console.error('Erro ao salvar', chave, e);
        }
    }

    // Tira acentos e deixa minúsculo (pra busca achar "coelho" em "Cóelho").
    function normalizar(texto) {
        return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    // ----------------------------------------------------------------------
    // 1) TOAST (notificação que desliza no canto da tela)
    // ----------------------------------------------------------------------
    // Uso: mostrarToast('Mensagem');
    //      mostrarToast('Mensagem', { acao: 'Ver carrinho', href: 'carrinho.html' });
    //      mostrarToast('Mensagem', { acao: 'Ver pedidos', onClick: funcao, tempo: 6000 });
    function mostrarToast(mensagem, opcoes) {
        opcoes = opcoes || {};
        let caixa = document.getElementById('fx-toast-box');
        if (!caixa) {
            caixa = document.createElement('div');
            caixa.id = 'fx-toast-box';
            document.body.appendChild(caixa);
        }

        const toast = document.createElement('div');
        toast.className = 'fx-toast';

        const texto = document.createElement('span');
        texto.className = 'fx-toast-msg';
        texto.textContent = mensagem;
        // textContent (e não innerHTML) é mais seguro: mostra o texto puro.
        toast.appendChild(texto);

        if (opcoes.acao) {
            const botao = document.createElement('a');
            botao.className = 'fx-toast-acao';
            botao.textContent = opcoes.acao;
            botao.href = opcoes.href || '#';
            if (opcoes.onClick) {
                botao.addEventListener('click', (e) => {
                    e.preventDefault();
                    opcoes.onClick();
                });
            }
            toast.appendChild(botao);
        }

        caixa.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        // requestAnimationFrame espera o navegador "desenhar" o toast antes
        // de aplicar a classe .show, e assim a animação de entrada funciona.

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, opcoes.tempo || 3500);
    }
    window.mostrarToast = mostrarToast;

    // ----------------------------------------------------------------------
    // 2) NÚMERO DO CARRINHO "PULA" QUANDO AUMENTA
    // ----------------------------------------------------------------------
    function animarBadge() {
        document.querySelectorAll('.cart-badge').forEach((badge) => {
            badge.classList.remove('bump');
            void badge.offsetWidth;
            // Esse "void badge.offsetWidth" força o navegador a reiniciar a
            // animação, para ela poder tocar de novo a cada clique.
            badge.classList.add('bump');
        });
    }

    // ----------------------------------------------------------------------
    // 9) [REMOVIDO] ESTOQUE FAKE
    // ----------------------------------------------------------------------
    // [REMOVIDO] Aqui existia a função estoqueDe(id), que transformava o id
    // do produto em um número de 1 a 8 (o "estoque" inventado de cada pet).
    // Ela era usada em 4 lugares: no addToCart (limite ao adicionar), no
    // updateQuantity (limite no botão "+" do carrinho), no iniciarEstoque
    // (selo "Restam X filhotes!") — todos removidos mais abaixo. Como nada
    // mais chama essa função, ela foi apagada junto.

    // ----------------------------------------------------------------------
    // SUBSTITUIÇÕES DE FUNÇÕES QUE JÁ EXISTEM
    // ----------------------------------------------------------------------
    // Como este bloco vem DEPOIS do resto, "reatribuir" window.nomeDaFuncao
    // faz o site inteiro passar a usar a versão nova (inclusive os onclick
    // dos HTMLs). As funções originais continuam no arquivo, só que deixam
    // de ser usadas quando existe uma versão nova aqui.

    // addToCart: mesma lógica de antes, mas com toast e animação do número.
    // [ALTERADO] Antes também tinha "limite de estoque". Removi:
    //   - a linha  const limite = estoqueDe(id);
    //   - o bloco  if (existente && existente.quantity >= limite) { ... return; }
    // Agora o produto sempre é adicionado (ou tem a quantidade aumentada em 1).
    window.addToCart = function (id, name, price, image) {
        const cart = getCart();
        const existente = cart.find((item) => item.id === id);

        if (existente) {
            existente.quantity += 1;
        } else {
            cart.push({ id: id, name: name, price: parsePreco(price), image: image, quantity: 1 });
        }

        saveCart(cart);
        animarBadge();
        mostrarToast(`${name} foi adicionado ao carrinho! 🐾`, { acao: 'Ver carrinho', href: 'carrinho.html' });
    };

    // [REMOVIDO] Aqui existia a substituição de window.updateQuantity
    // (guardava a original em "updateQuantityOriginal" e criava uma nova que
    // bloqueava o botão "+" quando chegava no estoque máximo). Ela existia
    // SÓ por causa do estoque. Sem ela, o site volta a usar a função
    // updateQuantity original da seção 1, que continua intacta.

    // renderCartPage: depois de desenhar a tabela, recalcula desconto/frete/total.
    const renderCartPageOriginal = window.renderCartPage;
    window.renderCartPage = function () {
        renderCartPageOriginal();
        atualizarResumoExtras();
    };

    // handleCheckout: agora também guarda o pedido no histórico.
    window.handleCheckout = function () {
        const cart = getCart();
        if (cart.length === 0) {
            mostrarToast('Seu carrinho está vazio! 🐾');
            return;
        }

        const resumo = calcularResumo(cart);
        const numero = 'FLF-' + String(Date.now()).slice(-6);

        const pedidos = lerJSON('fluffify_pedidos', []);
        pedidos.unshift({
            numero: numero,
            data: new Date().toLocaleString('pt-BR'),
            itens: cart.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: resumo.subtotal,
            desconto: resumo.desconto,
            frete: resumo.frete,
            total: resumo.total,
            cupom: resumo.cupom
        });
        salvarJSON('fluffify_pedidos', pedidos);

        // Depois de comprar, o cupom e o frete usados são apagados.
        localStorage.removeItem('fluffify_cupom');
        localStorage.removeItem('fluffify_frete');

        if (typeof window.dispararChuvaDePatinhas === 'function') {
            window.dispararChuvaDePatinhas();
        }
        clearCart();
        mostrarToast(`Pedido ${numero} realizado com sucesso! 🐶🐱`, {
            acao: 'Ver pedidos',
            onClick: abrirPedidos,
            tempo: 6000
        });
    };

    // ----------------------------------------------------------------------
    // MODAL (janelinha genérica usada por favoritos, pedidos e quiz)
    // ----------------------------------------------------------------------
    function fecharModal() {
        const overlay = document.getElementById('fx-overlay');
        if (overlay) overlay.remove();
    }

    function abrirModal(titulo) {
        fecharModal();
        const overlay = document.createElement('div');
        overlay.id = 'fx-overlay';
        overlay.className = 'fx-overlay';
        overlay.innerHTML = `
            <div class="fx-modal" role="dialog" aria-modal="true">
                <button type="button" class="fx-modal-close" aria-label="Fechar">&times;</button>
                <h3 class="fx-modal-title"></h3>
                <div class="fx-modal-body"></div>
            </div>
        `;
        overlay.querySelector('.fx-modal-title').textContent = titulo;
        // Clicar fora da janelinha (no fundo escuro) fecha.
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) fecharModal();
        });
        overlay.querySelector('.fx-modal-close').addEventListener('click', fecharModal);
        document.body.appendChild(overlay);
        return overlay.querySelector('.fx-modal-body');
    }

    // Tecla ESC também fecha a janelinha.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharModal();
    });

    // ----------------------------------------------------------------------
    // ENCONTRAR OS PETS DA PÁGINA (sem precisar mexer nos HTMLs)
    // ----------------------------------------------------------------------
    // O script procura todo botão que tem onclick="addToCart(...)", lê os
    // dados (id, nome, preço, imagem) de dentro do próprio onclick e descobre
    // qual é o "card" pegando o elemento pai mais próximo.
    function lerArgsDoAddToCart(elemento) {
        const codigo = elemento.getAttribute('onclick') || '';
        const achou = codigo.match(/addToCart\s*\(([^)]*)\)/);
        if (!achou) return null;
        try {
            const args = new Function('return [' + achou[1] + ']')();
            // Isso executa só os argumentos do onclick, que é o mesmo que o
            // navegador já faria quando clica no botão.
            return { id: String(args[0]), name: String(args[1]), price: parsePreco(args[2]), image: args[3] || '' };
        } catch (e) {
            return null;
        }
    }

    function listarProdutos() {
        // [ALTERADO] Adicionei  :not(.card-actions)  ao seletor de "card".
        // Antes, [class*="card"] pegava QUALQUER elemento com "card" no nome
        // da classe, inclusive o .card-actions (a faixa dos botões "Saiba Mais /
        // Comprar"). Como o script escolhe o elemento pai mais próximo do
        // botão, ele achava o .card-actions primeiro e colocava o coração
        // em cima dos botões. Com o :not(...), esse elemento é ignorado e o
        // script continua subindo até achar o .card de verdade.
        const seletorCard = 'article, li, [class*="card"]:not(.card-actions), [class*="produto"], [class*="product"], [class*="item"]';
        const vistos = new Set();
        const produtos = [];
        document.querySelectorAll('[onclick*="addToCart("]').forEach((btn) => {
            const dados = lerArgsDoAddToCart(btn);
            if (!dados) return;
            const card = (btn.parentElement && btn.parentElement.closest(seletorCard)) || btn.parentElement;
            if (!card || vistos.has(card)) return;
            vistos.add(card);
            produtos.push(Object.assign({ btn: btn, card: card }, dados));
        });
        return produtos;
    }

    function garantirPosicaoRelativa(card) {
        // Para o coração ficar "em cima" do card, o card precisa ter
        // position: relative.
        // [ALTERADO] Antes o comentário dizia "o coração e o selo (de estoque)".
        // Esta função CONTINUA existindo porque os favoritos dependem dela.
        if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    }

    // ----------------------------------------------------------------------
    // 3) FAVORITOS
    // ----------------------------------------------------------------------
    function pegarFavoritos() {
        return lerJSON('fluffify_favoritos', []);
    }

    function atualizarContadorFavoritos() {
        const total = pegarFavoritos().length;
        document.querySelectorAll('.fx-fav-count').forEach((el) => { el.textContent = total; });
    }

    function alternarFavorito(produto) {
        let favoritos = pegarFavoritos();
        const jaEra = favoritos.some((f) => f.id === produto.id);
        if (jaEra) {
            favoritos = favoritos.filter((f) => f.id !== produto.id);
            mostrarToast(`${produto.name} saiu dos favoritos.`);
        } else {
            favoritos.push({ id: produto.id, name: produto.name, price: produto.price, image: produto.image });
            mostrarToast(`${produto.name} foi para os favoritos! 💖`, { acao: 'Ver favoritos', onClick: abrirFavoritos });
        }
        salvarJSON('fluffify_favoritos', favoritos);
        pintarCoracoes();
        atualizarContadorFavoritos();
    }

    // Deixa os corações cheios (rosa) ou vazios conforme o que está salvo.
    function pintarCoracoes() {
        const ids = pegarFavoritos().map((f) => f.id);
        document.querySelectorAll('.fx-heart').forEach((botao) => {
            botao.classList.toggle('ativo', ids.includes(botao.dataset.id));
        });
    }

    function iniciarFavoritos(produtos) {
        produtos.forEach((p) => {
            garantirPosicaoRelativa(p.card);
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'fx-heart';
            botao.dataset.id = p.id;
            botao.title = 'Favoritar';
            botao.setAttribute('aria-label', 'Favoritar ' + p.name);
            botao.innerHTML = '<i class="fa-solid fa-heart"></i>';
            botao.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Impedem que o clique no coração abra o link do card.
                alternarFavorito(p);
            });
            p.card.appendChild(botao);
        });
        pintarCoracoes();
    }

    function abrirFavoritos() {
        const favoritos = pegarFavoritos();
        const corpo = abrirModal('Meus favoritos');

        if (!favoritos.length) {
            corpo.innerHTML = '<p class="fx-vazio">Você ainda não favoritou nenhum pet. Toque no ♥ dos cards! 🐾</p>';
            return;
        }

        corpo.innerHTML = favoritos.map((f) => `
            <div class="fx-lista-item" data-id="${escapeHTML(f.id)}">
                <img src="${escapeHTML(f.image)}" alt="${escapeHTML(f.name)}">
                <div class="fx-lista-info">
                    <strong>${escapeHTML(f.name)}</strong>
                    <span>${brl(f.price)}</span>
                </div>
                <button type="button" class="fx-mini" data-acao="add">Adicionar</button>
                <button type="button" class="fx-mini fx-mini-x" data-acao="remover" title="Remover">&times;</button>
            </div>
        `).join('');

        corpo.addEventListener('click', (e) => {
            const botao = e.target.closest('button[data-acao]');
            if (!botao) return;
            const id = botao.closest('[data-id]').dataset.id;
            const fav = pegarFavoritos().find((f) => f.id === id);
            if (!fav) return;
            if (botao.dataset.acao === 'add') {
                window.addToCart(fav.id, fav.name, fav.price, fav.image);
            } else {
                salvarJSON('fluffify_favoritos', pegarFavoritos().filter((f) => f.id !== id));
                pintarCoracoes();
                atualizarContadorFavoritos();
                abrirFavoritos();
                // Reabre a janelinha para mostrar a lista já atualizada.
            }
        });
    }

    // ----------------------------------------------------------------------
    // 9) [REMOVIDO] SELO DE ESTOQUE NOS CARDS
    // ----------------------------------------------------------------------
    // [REMOVIDO] Aqui existia a função iniciarEstoque(produtos), que criava
    // o selo "Resta só 1 filhote!" / "Restam X filhotes!" em cada card
    // (com a classe CSS .fx-stock, que também foi removida do style.css).

    // ----------------------------------------------------------------------
    // 10) AVALIAÇÃO POR ESTRELAS (só na página de um animal)
    // ----------------------------------------------------------------------
    function iniciarEstrelas(produto) {
        const notas = lerJSON('fluffify_avaliacoes', {});
        const caixa = document.createElement('div');
        caixa.className = 'fx-avaliacao';
        caixa.innerHTML = '<span class="fx-av-titulo">Avalie este pet:</span><span class="fx-stars"></span><small class="fx-av-msg"></small>';

        const estrelas = caixa.querySelector('.fx-stars');
        const msg = caixa.querySelector('.fx-av-msg');

        for (let i = 1; i <= 5; i++) {
            const e = document.createElement('button');
            e.type = 'button';
            e.textContent = '★';
            e.dataset.nota = i;
            e.setAttribute('aria-label', i + ' estrela(s)');
            estrelas.appendChild(e);
        }

        function pintar(n) {
            estrelas.querySelectorAll('button').forEach((b) => {
                b.classList.toggle('on', Number(b.dataset.nota) <= n);
            });
        }
        function atualizar() {
            const n = notas[produto.id] || 0;
            pintar(n);
            msg.textContent = n ? `Sua avaliação: ${n}/5 — obrigado! 🐾` : 'Toque nas estrelas para avaliar.';
        }

        estrelas.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            notas[produto.id] = Number(b.dataset.nota);
            salvarJSON('fluffify_avaliacoes', notas);
            atualizar();
            mostrarToast('Obrigado pela sua avaliação! ⭐');
        });
        estrelas.addEventListener('mouseover', (e) => {
            const b = e.target.closest('button');
            if (b) pintar(Number(b.dataset.nota));
        });
        estrelas.addEventListener('mouseleave', atualizar);

           // [ALTERADO] Antes a avaliação era inserida logo antes do botão
        // "Adicionar ao Carrinho", ou seja, DENTRO do .acoes-detalhes (a faixa
        // flex que segura os dois botões). Por isso ela virava um terceiro
        // item da linha e espremia os botões. Agora procuramos essa faixa
        // com .closest('.acoes-detalhes') e inserimos a avaliação ANTES dela,
        // fora da linha dos botões. Se por algum motivo a faixa não existir
        // na página, o "else" mantém o comportamento antigo como reserva.
        const areaBotoes = produto.btn.closest('.acoes-detalhes');
        if (areaBotoes) {
            areaBotoes.parentNode.insertBefore(caixa, areaBotoes);
        } else {
            produto.btn.parentNode.insertBefore(caixa, produto.btn);
        }
        atualizar();
        }

    // ----------------------------------------------------------------------
    // 4) BUSCA E ORDENAÇÃO NAS PÁGINAS DE CATEGORIA
    // ----------------------------------------------------------------------
    function iniciarBusca(produtos) {
        const grade = produtos[0].card.parentElement;
        const cards = produtos.filter((p) => p.card.parentElement === grade);
        if (cards.length < 3) return;
        const ordemOriginal = cards.map((p) => p.card);

        const barra = document.createElement('div');
        barra.className = 'fx-toolbar';
        barra.innerHTML = `
            <input type="search" class="fx-busca" placeholder=" Buscar pet pelo nome..." aria-label="Buscar pet">
            <select class="fx-ordem" aria-label="Ordenar">
                <option value="">Ordenar por...</option>
                <option value="menor">Menor preço</option>
                <option value="maior">Maior preço</option>
                <option value="nome">Nome (A-Z)</option>
            </select>
        `;
        const aviso = document.createElement('p');
        aviso.className = 'fx-vazio';
        aviso.style.display = 'none';
        aviso.textContent = 'Nenhum pet encontrado com esse nome. 🐾';

        grade.parentNode.insertBefore(barra, grade);
        grade.parentNode.insertBefore(aviso, grade);

        const campo = barra.querySelector('.fx-busca');
        const seletor = barra.querySelector('.fx-ordem');

        function aplicar() {
            const termo = normalizar(campo.value.trim());
            let visiveis = 0;
                cards.forEach((p) => {
                // [ALTERADO] Agora o card também precisa combinar com a categoria
                // escolhida nos botões (Gatos, Cães...). Quando nenhuma categoria
                // está escolhida, window.fxCategoriaAtiva fica vazia e todos passam.
                // Nas outras páginas essa variável nem existe (fica undefined),
                // então nada muda nelas.
                const categoriaOk = !window.fxCategoriaAtiva || p.card.dataset.categoria === window.fxCategoriaAtiva;
                const combina = categoriaOk && normalizar(p.name).includes(termo);
                p.card.style.display = combina ? '' : 'none';
                if (combina) visiveis++;
            });
            aviso.style.display = visiveis ? 'none' : 'block';

            // Reordena os cards mudando a ordem deles dentro da grade.
            let lista = cards.slice();
            if (seletor.value === 'menor') lista.sort((a, b) => a.price - b.price);
            else if (seletor.value === 'maior') lista.sort((a, b) => b.price - a.price);
            else if (seletor.value === 'nome') lista.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            else lista = ordemOriginal.map((el) => cards.find((p) => p.card === el));
            lista.forEach((p) => grade.appendChild(p.card));
        }

        campo.addEventListener('input', aplicar);
        seletor.addEventListener('change', aplicar);
    }


        // ----------------------------------------------------------------------
    // 12) [NOVO] FILTRO POR CATEGORIA (página todos-os-pets.html)
    // ----------------------------------------------------------------------
    function iniciarFiltrosDeCategoria() {
        const filtros = document.querySelector('.fx-filtros');
        if (!filtros) return;
        // Só continua nas páginas que têm os botões de filtro.

        window.fxCategoriaAtiva = '';
        // Começa sem filtro (mostra todos).

        filtros.addEventListener('click', (e) => {
            const botao = e.target.closest('button[data-cat]');
            if (!botao) return;
            window.fxCategoriaAtiva = botao.dataset.cat;
            // dataset.cat lê o atributo data-cat do botão (ex.: "gatos").

            filtros.querySelectorAll('button').forEach((b) => b.classList.toggle('ativo', b === botao));
            // Deixa só o botão clicado com a classe "ativo" (o rosa preenchido).

            const campo = document.querySelector('.fx-busca');
            if (campo) campo.dispatchEvent(new Event('input'));
            // Truque: "finge" que a pessoa digitou algo no campo de busca. Isso
            // faz a função aplicar() rodar de novo, já considerando a categoria.
        });
    }
    // ----------------------------------------------------------------------
    // 5 e 6) CUPOM E FRETE NA PÁGINA DO CARRINHO
    // ----------------------------------------------------------------------
    // Calcula subtotal, desconto do cupom, frete e total final.
    function calcularResumo(cart) {
        const subtotal = cart.reduce((soma, i) => soma + i.price * i.quantity, 0);
        const cupom = localStorage.getItem('fluffify_cupom') || '';
        const percentual = CUPONS[cupom] || 0;
        const desconto = subtotal * percentual;

        const freteSalvo = lerJSON('fluffify_frete', null);
        let frete = 0;
        if (cart.length && freteSalvo) {
            frete = subtotal >= FRETE_GRATIS_ACIMA ? 0 : freteSalvo.valor;
        }
        return {
            subtotal: subtotal,
            cupom: percentual ? cupom : '',
            desconto: desconto,
            frete: frete,
            total: subtotal - desconto + frete
        };
    }

    // Regras de frete simuladas por estado.
    function freteParaUF(uf) {
        if (uf === 'SP') return { valor: 15, prazo: '2 a 4 dias úteis' };
        if (['RJ', 'MG', 'ES'].includes(uf)) return { valor: 25, prazo: '3 a 6 dias úteis' };
        if (['PR', 'SC', 'RS', 'DF', 'GO', 'MS', 'MT'].includes(uf)) return { valor: 35, prazo: '4 a 8 dias úteis' };
        if (uf) return { valor: 45, prazo: '6 a 12 dias úteis' };
        return { valor: 29.9, prazo: '5 a 10 dias úteis' };
        // Sem UF (ex.: sem internet) usa um valor padrão.
    }

    // Atualiza as linhas de Desconto, Frete e o Total na tela do carrinho.
    function atualizarResumoExtras() {
        const totalEl = document.getElementById('cart-total');
        const linhaDesc = document.getElementById('fx-row-desconto');
        const linhaFrete = document.getElementById('fx-row-frete');
        if (!totalEl || !linhaDesc || !linhaFrete) return;
        // Se não estamos na página do carrinho (ou ainda não criamos as
        // linhas), não faz nada.

        const cart = getCart();
        const r = calcularResumo(cart);

        if (!cart.length) {
            linhaDesc.style.display = 'none';
            linhaFrete.style.display = 'none';
            totalEl.textContent = 'R$ 0,00';
            return;
        }

        linhaDesc.style.display = r.desconto > 0 ? '' : 'none';
        linhaDesc.querySelector('.fx-desc-label').textContent = `Desconto (${r.cupom}):`;
        linhaDesc.querySelector('.fx-desc-valor').textContent = '- ' + brl(r.desconto);

        const freteSalvo = lerJSON('fluffify_frete', null);
        linhaFrete.style.display = freteSalvo ? '' : 'none';
        if (freteSalvo) {
            linhaFrete.querySelector('.fx-frete-valor').textContent = r.frete === 0 ? 'Grátis ' : brl(r.frete);
        }

        totalEl.textContent = brl(r.total);
    }

    function iniciarExtrasDoCarrinho() {
        const resumo = document.querySelector('.cart-summary');
        const linhaTotal = document.querySelector('.cart-summary-row.total');
        const botaoFinalizar = resumo ? resumo.querySelector('button') : null;
        if (!resumo || !linhaTotal || !botaoFinalizar) return;
        // Só continua se estivermos na página do carrinho.

        // Linhas novas: Desconto e Frete (aparecem antes do Total).
        const linhaDesc = document.createElement('div');
        linhaDesc.className = 'cart-summary-row';
        linhaDesc.id = 'fx-row-desconto';
        linhaDesc.style.display = 'none';
        linhaDesc.innerHTML = '<span class="fx-desc-label">Desconto:</span><span class="fx-desc-valor"></span>';

        const linhaFrete = document.createElement('div');
        linhaFrete.className = 'cart-summary-row';
        linhaFrete.id = 'fx-row-frete';
        linhaFrete.style.display = 'none';
        linhaFrete.innerHTML = '<span>Frete:</span><span class="fx-frete-valor"></span>';

        linhaTotal.parentNode.insertBefore(linhaDesc, linhaTotal);
        linhaTotal.parentNode.insertBefore(linhaFrete, linhaTotal);

        // Campos de cupom e CEP (aparecem antes do botão "Finalizar Pedido").
        const extras = document.createElement('div');
        extras.className = 'fx-cart-extras';
        extras.innerHTML = `
            <div class="fx-field">
                <label for="fx-cupom-input">Cupom de desconto</label>
                <div class="fx-row">
                    <input type="text" id="fx-cupom-input" placeholder="Ex.: FLUFFY10" autocomplete="off">
                    <button type="button" id="fx-cupom-btn">Aplicar</button>
                </div>
                <small id="fx-cupom-msg"></small>
            </div>
            <div class="fx-field">
                <label for="fx-cep-input">Calcular frete</label>
                <div class="fx-row">
                    <input type="text" id="fx-cep-input" placeholder="00000-000" maxlength="9" inputmode="numeric" autocomplete="off">
                    <button type="button" id="fx-cep-btn">Calcular</button>
                </div>
                <small id="fx-cep-msg"></small>
            </div>
        `;
        resumo.insertBefore(extras, botaoFinalizar);

        const cupomInput = document.getElementById('fx-cupom-input');
        const cupomMsg = document.getElementById('fx-cupom-msg');
        const cepInput = document.getElementById('fx-cep-input');
        const cepMsg = document.getElementById('fx-cep-msg');

        // Restaura o que já estava salvo (se a pessoa voltar pro carrinho).
        const cupomSalvo = localStorage.getItem('fluffify_cupom');
        if (cupomSalvo && CUPONS[cupomSalvo]) {
            cupomInput.value = cupomSalvo;
            cupomMsg.textContent = `Cupom ${cupomSalvo} aplicado: ${Math.round(CUPONS[cupomSalvo] * 100)}% de desconto! `;
            cupomMsg.className = 'fx-ok';
        }
        const freteSalvo = lerJSON('fluffify_frete', null);
        if (freteSalvo) {
            cepInput.value = freteSalvo.cep;
            cepMsg.textContent = `${freteSalvo.local}: prazo de ${freteSalvo.prazo}.`;
            cepMsg.className = 'fx-ok';
        }

        // ---- Botão APLICAR CUPOM ----
        document.getElementById('fx-cupom-btn').addEventListener('click', () => {
            const codigo = cupomInput.value.trim().toUpperCase();
            if (!codigo) {
                cupomMsg.textContent = 'Digite um cupom.';
                cupomMsg.className = 'fx-erro';
            } else if (CUPONS[codigo] !== undefined) {
                localStorage.setItem('fluffify_cupom', codigo);
                cupomMsg.textContent = `Cupom ${codigo} aplicado: ${Math.round(CUPONS[codigo] * 100)}% de desconto! `;
                cupomMsg.className = 'fx-ok';
            } else {
                localStorage.removeItem('fluffify_cupom');
                cupomMsg.textContent = 'Cupom inválido. ';
                cupomMsg.className = 'fx-erro';
            }
            atualizarResumoExtras();
        });

        // ---- Máscara do CEP: 00000-000 ----
        cepInput.addEventListener('input', () => {
            let v = cepInput.value.replace(/\D/g, '').slice(0, 8);
            if (v.length > 5) v = v.replace(/^(\d{5})(\d{0,3})$/, '$1-$2');
            cepInput.value = v;
        });

        // ---- Botão CALCULAR FRETE ----
        document.getElementById('fx-cep-btn').addEventListener('click', async () => {
            const cep = cepInput.value.replace(/\D/g, '');
            if (cep.length !== 8) {
                cepMsg.textContent = 'Digite um CEP com 8 números.';
                cepMsg.className = 'fx-erro';
                return;
            }
            cepMsg.textContent = 'Calculando...';
            cepMsg.className = '';

            let cidade = '';
            let uf = '';
            try {
                const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const dados = await resposta.json();
                if (dados.erro) {
                    cepMsg.textContent = 'CEP não encontrado. 😿';
                    cepMsg.className = 'fx-erro';
                    return;
                }
                cidade = dados.localidade;
                uf = dados.uf;
            } catch (e) {
                // Sem internet ou API fora do ar: segue com o valor padrão.
            }

            const regra = freteParaUF(uf);
            const local = cidade ? `${cidade}/${uf}` : 'Entrega';
            salvarJSON('fluffify_frete', { cep: cepInput.value, local: local, valor: regra.valor, prazo: regra.prazo });
            cepMsg.textContent = `${local}: ${brl(regra.valor)} — prazo de ${regra.prazo}. (Frete grátis acima de ${brl(FRETE_GRATIS_ACIMA)})`;
            cepMsg.className = 'fx-ok';
            atualizarResumoExtras();
        });

        // O botão "Finalizar Pedido" passa a chamar o handleCheckout daqui.
        // Assim você NÃO precisa editar o carrinho.html.
        botaoFinalizar.removeAttribute('onclick');
        botaoFinalizar.addEventListener('click', () => window.handleCheckout());

        atualizarResumoExtras();
    }

    // ----------------------------------------------------------------------
    // 11) MEUS PEDIDOS
    // ----------------------------------------------------------------------
    function abrirPedidos() {
        const pedidos = lerJSON('fluffify_pedidos', []);
        const corpo = abrirModal('Meus pedidos ');

        if (!pedidos.length) {
            corpo.innerHTML = '<p class="fx-vazio">Você ainda não fez nenhum pedido. Que tal adotar um filhote? 🐾</p>';
            return;
        }

        corpo.innerHTML = pedidos.map((p) => `
            <div class="fx-pedido">
                <div class="fx-pedido-topo">
                    <strong>${escapeHTML(p.numero)}</strong>
                    <span>${escapeHTML(p.data)}</span>
                </div>
                <ul>
                    ${p.itens.map((i) => `<li>${i.quantity}x ${escapeHTML(i.name)} — ${brl(i.price * i.quantity)}</li>`).join('')}
                </ul>
                <div class="fx-pedido-rodape">
                    ${p.desconto > 0 ? `<span>Desconto: - ${brl(p.desconto)}</span>` : ''}
                    ${p.frete > 0 ? `<span>Frete: ${brl(p.frete)}</span>` : ''}
                    <strong>Total: ${brl(p.total)}</strong>
                </div>
            </div>
        `).join('') + '<button type="button" class="fx-mini fx-limpar" id="fx-limpar-pedidos">Limpar histórico</button>';

        document.getElementById('fx-limpar-pedidos').addEventListener('click', () => {
            localStorage.removeItem('fluffify_pedidos');
            abrirPedidos();
        });
    }

    // ----------------------------------------------------------------------
    // 7) MODO ESCURO
    // ----------------------------------------------------------------------
    function aplicarTema(tema) {
        document.body.classList.toggle('dark', tema === 'dark');
        const icone = document.querySelector('#fx-tema-btn i');
        if (icone) icone.className = tema === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }

    function alternarTema() {
        const novo = document.body.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('fluffify_tema', novo);
        aplicarTema(novo);
    }

    // ----------------------------------------------------------------------
    // 8) QUIZ "QUAL PET COMBINA COM VOCÊ?"
    // ----------------------------------------------------------------------
    // Cada resposta dá pontos para um ou mais tipos de pet. No final, ganha
    // o tipo que somou mais pontos. Para mudar o quiz, mexa nestas listas.
    const PERGUNTAS = [
        { texto: 'Como é a sua rotina?', opcoes: [
            ['Passo pouco tempo em casa', { gato: 2, roedor: 1 }],
            ['Estou sempre em casa', { ave: 2, cao: 1, gato: 1 }],
            ['Sou bem ativo(a) e adoro sair', { cao: 3 }],
            ['Depende do dia', { roedor: 1, gato: 1, ave: 1 }]
        ] },
        { texto: 'Onde você mora?', opcoes: [
            ['Apartamento pequeno', { gato: 2, roedor: 2, ave: 1 }],
            ['Casa com quintal', { cao: 3, ave: 1 }],
            ['Apartamento grande', { cao: 1, gato: 2, ave: 2 }]
        ] },
        { texto: 'O que você mais quer de um pet?', opcoes: [
            ['Um parceiro de aventuras', { cao: 3 }],
            ['Carinho tranquilo e independência', { gato: 3 }],
            ['Alguém que converse e cante', { ave: 3 }],
            ['Uma fofura de bolso', { roedor: 3 }]
        ] },
        { texto: 'Quanto tempo por dia você teria para cuidar dele?', opcoes: [
            ['Bastante, adoro rotina de cuidados', { cao: 2, ave: 1 }],
            ['Um pouco', { gato: 2, roedor: 1 }],
            ['Pouco tempo', { roedor: 2, gato: 1 }]
        ] }
    ];

    const RESULTADOS = {
        cao: { titulo: 'Um cãozinho! 🐶', texto: 'Você é do tipo que quer companhia para tudo: passeios, brincadeiras e muita festa quando chega em casa.', link: 'caes.html' },
        gato: { titulo: 'Um gatinho! 🐱', texto: 'Carinho na hora certa, independência e um companheiro que se adapta bem à sua rotina.', link: 'gatos.html' },
        ave: { titulo: 'Uma avezinha! 🦜', texto: 'Você quer um pet que interage, canta e enche a casa de alegria.', link: 'aves.html' },
        roedor: { titulo: 'Um roedorzinho! 🐹', texto: 'Pequeno, fofo e fácil de manter: perfeito para quem tem pouco espaço.', link: 'roedores.html' }
    };

    function abrirQuiz() {
        const corpo = abrirModal('Qual pet combina com você? ');
        let indice = 0;
        const pontos = { cao: 0, gato: 0, ave: 0, roedor: 0 };

        function mostrarPergunta() {
            const pergunta = PERGUNTAS[indice];
            corpo.innerHTML = `
                <p class="fx-quiz-passo">Pergunta ${indice + 1} de ${PERGUNTAS.length}</p>
                <p class="fx-quiz-pergunta"></p>
                <div class="fx-quiz-opcoes"></div>
            `;
            corpo.querySelector('.fx-quiz-pergunta').textContent = pergunta.texto;
            const lista = corpo.querySelector('.fx-quiz-opcoes');
            pergunta.opcoes.forEach((opcao) => {
                const botao = document.createElement('button');
                botao.type = 'button';
                botao.className = 'fx-quiz-opt';
                botao.textContent = opcao[0];
                botao.addEventListener('click', () => {
                    Object.keys(opcao[1]).forEach((tipo) => { pontos[tipo] += opcao[1][tipo]; });
                    indice++;
                    if (indice < PERGUNTAS.length) mostrarPergunta();
                    else mostrarResultado();
                });
                lista.appendChild(botao);
            });
        }

        function mostrarResultado() {
            let vencedor = 'cao';
            Object.keys(pontos).forEach((tipo) => {
                if (pontos[tipo] > pontos[vencedor]) vencedor = tipo;
            });
            const r = RESULTADOS[vencedor];
            corpo.innerHTML = `
                <p class="fx-quiz-resultado-titulo">${r.titulo}</p>
                <p>${r.texto}</p>
                <a class="fx-quiz-link" href="${r.link}">Ver filhotes disponíveis</a>
                <button type="button" class="fx-mini" id="fx-quiz-refazer">Refazer o quiz</button>
            `;
            document.getElementById('fx-quiz-refazer').addEventListener('click', abrirQuiz);
        }

        mostrarPergunta();
    }

    // ----------------------------------------------------------------------
    // BOTÕES NO CABEÇALHO (favoritos, pedidos, tema) E LINK DO QUIZ NO MENU
    // ----------------------------------------------------------------------
    function criarBotoesDoCabecalho() {
        const area = document.querySelector('.user-actions');
        if (area) {
            const ferramentas = document.createElement('span');
            ferramentas.className = 'fx-tools';
            ferramentas.innerHTML = `
                <button type="button" id="fx-fav-btn" title="Meus favoritos" aria-label="Meus favoritos">
                    <i class="fa-solid fa-heart"></i><span class="fx-fav-count">0</span>
                </button>
                <button type="button" id="fx-pedidos-btn" title="Meus pedidos" aria-label="Meus pedidos">
                    <i class="fa-solid fa-receipt"></i>
                </button>
                <button type="button" id="fx-tema-btn" title="Modo escuro" aria-label="Alternar modo escuro">
                    <i class="fa-solid fa-moon"></i>
                </button>
            `;
            area.insertBefore(ferramentas, area.firstChild);
            document.getElementById('fx-fav-btn').addEventListener('click', abrirFavoritos);
            document.getElementById('fx-pedidos-btn').addEventListener('click', abrirPedidos);
            document.getElementById('fx-tema-btn').addEventListener('click', alternarTema);
        }

             const menu = document.querySelector('header nav');
        if (menu) {
            // [NOVO] Link "Todos os pets" no menu, logo depois de "Início".
            // Pra funcionar também nas páginas dentro da pasta animais/ (onde o
            // link de início costuma ser "../index.html"), pegamos o "prefixo"
            // do próprio link de início: "" na raiz, "../" dentro de animais/.
            const linkInicio = menu.querySelector('a[href$="index.html"]');
            const prefixo = linkInicio ? linkInicio.getAttribute('href').replace('index.html', '') : '';
            const paginaAtual = location.pathname.split('/').pop() || 'index.html';

            const linkTodos = document.createElement('a');
            linkTodos.href = prefixo + 'todos-os-pets.html';
            linkTodos.innerHTML = '<i class="fa-solid fa-border-all"></i> Todos os pets';
            if (paginaAtual === 'todos-os-pets.html') linkTodos.className = 'active';
            // Marca como "active" quando estamos na própria página.

            if (linkInicio) linkInicio.after(linkTodos);
            else menu.appendChild(linkTodos);

            const link = document.createElement('a');
            link.href = '#';
            link.id = 'fx-quiz-link';
            link.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Quiz';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                abrirQuiz();
            });
            menu.appendChild(link);
        }
    }

    // ----------------------------------------------------------------------
    // INICIALIZAÇÃO DOS EXTRAS
    // ----------------------------------------------------------------------
    function iniciarExtras() {
        const pagina = location.pathname.split('/').pop() || 'index.html';

        criarBotoesDoCabecalho();
        aplicarTema(localStorage.getItem('fluffify_tema') || 'light');
        atualizarContadorFavoritos();

        const produtos = listarProdutos();
        iniciarFavoritos(produtos);
        // [REMOVIDO] Aqui ficava a chamada  iniciarEstoque(produtos);
        // (a função que desenhava o selo de estoque nos cards).

        // Se a página tem só UM pet com botão de comprar, é a página do animal.
        if (produtos.length === 1) iniciarEstrelas(produtos[0]);

        // Se tem vários pets e não é uma página excluída, mostra busca/ordenação.
          if (produtos.length >= 3 && !PAGINAS_SEM_BUSCA.includes(pagina)) iniciarBusca(produtos);

        // [NOVO] Liga os botões de filtro por categoria (só existem em todos-os-pets.html).
        iniciarFiltrosDeCategoria();

        iniciarExtrasDoCarrinho();
    }

    // "defer" já garante que o HTML carregou, mas essa checagem cobre os dois casos.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarExtras);
    } else {
        iniciarExtras();
    }
})();