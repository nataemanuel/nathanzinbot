// ==========================================
// VERIFICAR LOGIN
// ==========================================

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login.html";
}


// ==========================================
// DADOS DO USUÁRIO
// ==========================================

const userData = JSON.parse(
    localStorage.getItem("user") || "null"
);

if (userData) {

    const userName =
        document.getElementById("userName");

    const userEmail =
        document.getElementById("userEmail");

    const userAvatar =
        document.getElementById("userAvatar");


    if (userName) {
        userName.textContent =
            userData.name;
    }


    if (userEmail) {
        userEmail.textContent =
            userData.email;
    }


    if (userAvatar) {
        userAvatar.textContent =
            getInitials(userData.name);
    }

}


// ==========================================
// INICIAIS DO USUÁRIO
// ==========================================

function getInitials(name) {

    if (!name) {
        return "U";
    }

    const names =
        name.trim().split(/\s+/);


    if (names.length === 1) {

        return names[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        names[0][0] +
        names[names.length - 1][0]
    ).toUpperCase();

}


// ==========================================
// MENU DO USUÁRIO
// ==========================================

function toggleUserMenu() {

    const menu =
        document.getElementById("userMenu");

    if (menu) {
        menu.classList.toggle("active");
    }

}


document.addEventListener(
    "click",
    function (event) {

        const userArea =
            document.querySelector(".user-area");

        const menu =
            document.getElementById("userMenu");


        if (
            userArea &&
            menu &&
            !userArea.contains(event.target)
        ) {

            menu.classList.remove("active");

        }

    }
);


// ==========================================
// SESSION ID
// ==========================================

let currentSessionId = "";


// ==========================================
// INICIAR PÁGINA
// ==========================================

window.onload = function () {

    startNewChat();

    loadAllChats();

};


// ==========================================
// NOVA CONVERSA
// ==========================================

function startNewChat() {

    currentSessionId =
        "chat-" + crypto.randomUUID();


    const chatbox =
        document.getElementById("chatbox");


    if (!chatbox) {
        return;
    }


    chatbox.innerHTML = "";


    const welcome =
        document.createElement("p");


    welcome.id =
        "welcome-msg";


    welcome.style.textAlign =
        "center";

    welcome.style.color =
        "#80868b";

    welcome.style.fontSize =
        "0.9rem";

    welcome.style.marginTop =
        "20px";


    welcome.textContent =
        "Comece uma nova conversa!";


    chatbox.appendChild(welcome);


    const chatStatus =
        document.getElementById("chat-status");


    if (chatStatus) {

        chatStatus.innerText =
            "Conversa Ativa";

    }


    hideTyping();

}


// ==========================================
// INDICADOR DIGITANDO
// ==========================================

function showTyping() {

    const chatbox =
        document.getElementById("chatbox");

    if (!chatbox) {
        return;
    }

    let bubble =
        document.getElementById("typingBubble");

    // Se não existir, cria o indicador
    if (!bubble) {

        bubble =
            document.createElement("div");

        bubble.className =
            "typing-indicator";

        bubble.id =
            "typingBubble";

        bubble.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;

        chatbox.appendChild(bubble);

    } else {

        // Coloca o indicador no final
        // da conversa
        chatbox.appendChild(bubble);

    }

    bubble.style.display =
        "flex";


    // Desce o scroll até o indicador

    chatbox.scrollTop =
        chatbox.scrollHeight;

}


function hideTyping() {

    const bubble =
        document.getElementById(
            "typingBubble"
        );


    if (bubble) {

        bubble.style.display =
            "none";

    }

}


// ==========================================
// ENVIAR MENSAGEM
// ==========================================

async function sendMessage() {

    const input =
        document.getElementById("userInput");

    const imageInput =
        document.getElementById("imageInput");

    const imagePreview =
        document.getElementById("imagePreview");

    const chatbox =
        document.getElementById("chatbox");


    if (!input || !chatbox) {
        return;
    }


    const message =
        input.value.trim();


    const image =
        imageInput?.files?.[0] || null;


    // ======================================
    // NÃO PERMITIR ENVIO VAZIO
    // ======================================

    if (!message && !image) {
        return;
    }


    // ======================================
    // VERIFICAR TAMANHO DA IMAGEM
    // ======================================

    if (
        image &&
        image.size > 10 * 1024 * 1024
    ) {

        showError(
            "A imagem deve ter no máximo 10 MB."
        );

        return;

    }


    // ======================================
    // REMOVER MENSAGEM INICIAL
    // ======================================

    const welcome =
        document.getElementById("welcome-msg");


    if (welcome) {
        welcome.remove();
    }


    // ======================================
    // MOSTRAR MENSAGEM DO USUÁRIO
    // ======================================

    const userDiv =
        document.createElement("div");


    userDiv.className =
        "message user";


    let userContent =
        "<b>Você:</b><br>";


    // ======================================
    // MOSTRAR IMAGEM NO CHAT
    // ======================================

    if (image) {

        const imageURL =
            URL.createObjectURL(image);


        userContent += `
            <img
                src="${imageURL}"
                class="chat-image"
                alt="Imagem enviada"
            >
        `;

    }


    // ======================================
    // MOSTRAR TEXTO
    // ======================================

    if (message) {

        userContent +=
            `<br>${escapeHtml(message)}`;

    }


    userDiv.innerHTML =
        userContent;


    chatbox.appendChild(userDiv);


    // ======================================
    // MOSTRAR DIGITANDO
    // ======================================

    showTyping();


    try {

        // ==================================
        // FORM DATA
        // ==================================

        const formData =
            new FormData();


        formData.append(
            "message",
            message
        );


        formData.append(
            "sessionId",
            currentSessionId
        );


        // ==================================
        // ADICIONAR IMAGEM
        // ==================================

        if (image) {

            formData.append(
                "image",
                image
            );

        }


        // ==================================
        // LIMPAR INPUT
        // SOMENTE DEPOIS DO FORMDATA
        // ==================================

        input.value = "";


        if (imageInput) {
            imageInput.value = "";
        }


        if (imagePreview) {
            imagePreview.innerHTML = "";
        }


        // ==================================
        // ENVIAR PARA SERVIDOR
        // ==================================

        const response =
            await fetch("/chat", {

                method: "POST",

                headers: {

                    "Authorization":
                        "Bearer " +
                        localStorage.getItem(
                            "token"
                        )

                },

                body: formData

            });


        // ==================================
        // TOKEN INVÁLIDO
        // ==================================

        if (response.status === 401) {

            logout();

            return;

        }


        const data =
            await response.json();


        hideTyping();


        // ==================================
        // RESPOSTA DO GEMINI
        // ==================================

        if (data.reply) {

            const botDiv =
                document.createElement("div");


            botDiv.className =
                "message bot";


            botDiv.innerHTML =
                `<b>NathanBot:</b><br>${formatBotResponse(
                    data.reply
                )}`;


            chatbox.appendChild(
                botDiv
            );


            // Atualizar histórico
            loadAllChats();


        } else {

            showError(
                data.error ||
                "Erro desconhecido."
            );

        }


    } catch (error) {

        console.error(
            "Erro no envio:",
            error
        );


        hideTyping();


        showError(
            "Conexão falhou."
        );

    }


    chatbox.scrollTop =
        chatbox.scrollHeight;

}


// ==========================================
// PRÉ-VISUALIZAÇÃO DA IMAGEM
// ==========================================

function previewImage() {

    const imageInput =
        document.getElementById("imageInput");

    const imagePreview =
        document.getElementById("imagePreview");


    if (
        !imageInput ||
        !imagePreview
    ) {

        return;

    }


    const image =
        imageInput.files[0];


    // Nenhuma imagem
    if (!image) {

        imagePreview.innerHTML =
            "";

        return;

    }


    // ======================================
    // VERIFICAR TIPO
    // ======================================

    if (
        !image.type.startsWith("image/")
    ) {

        imagePreview.innerHTML =
            "<p>Selecione uma imagem válida.</p>";

        imageInput.value =
            "";

        return;

    }


    // ======================================
    // VERIFICAR TAMANHO
    // ======================================

    if (
        image.size > 10 * 1024 * 1024
    ) {

        imagePreview.innerHTML =
            "<p>A imagem deve ter no máximo 10 MB.</p>";

        imageInput.value =
            "";

        return;

    }


    // ======================================
    // CRIAR URL DA IMAGEM
    // ======================================

    const imageURL =
        URL.createObjectURL(image);


    // ======================================
    // MOSTRAR PREVIEW
    // ======================================

    imagePreview.innerHTML = `
        <div class="preview-container">

            <img
                src="${imageURL}"
                class="preview-image"
                alt="Pré-visualização"
            >

            <button
                type="button"
                class="remove-image"
                onclick="removeImage()"
            >
                ×
            </button>

        </div>
    `;

}


// ==========================================
// REMOVER IMAGEM
// ==========================================

function removeImage() {

    const imageInput =
        document.getElementById("imageInput");

    const imagePreview =
        document.getElementById("imagePreview");


    if (imageInput) {

        imageInput.value =
            "";

    }


    if (imagePreview) {

        imagePreview.innerHTML =
            "";

    }

}


// ==========================================
// ATIVAR PREVIEW DO INPUT
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const imageInput =
            document.getElementById(
                "imageInput"
            );


        if (imageInput) {

            imageInput.addEventListener(
                "change",
                previewImage
            );

        }

    }
);


// ==========================================
// ESCAPAR HTML
// ==========================================

function escapeHtml(text) {

    const div =
        document.createElement("div");


    div.textContent =
        text;


    return div.innerHTML;

}


// ==========================================
// FORMATAR RESPOSTA DO GEMINI
// ==========================================

function formatBotResponse(text) {

    if (!text) {
        return "";
    }


    // Protege o HTML
    let formatted =
        escapeHtml(text);


    // ======================================
    // NEGRITO
    // **texto**
    // ======================================

    formatted =
        formatted.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    // ======================================
    // ITÁLICO
    // *texto*
    // ======================================

    formatted =
        formatted.replace(
            /(?<!\*)\*([^*]+)\*(?!\*)/g,
            "<em>$1</em>"
        );


    // ======================================
    // QUEBRAS DE LINHA
    // ======================================

    formatted =
        formatted.replace(
            /\n/g,
            "<br>"
        );


    return formatted;

}


// ==========================================
// ERRO
// ==========================================

function showError(text) {

    const chatbox =
        document.getElementById(
            "chatbox"
        );


    if (!chatbox) {
        return;
    }


    const error =
        document.createElement("div");


    error.className =
        "message error";


    error.innerHTML =
        `<b>Erro:</b> ${escapeHtml(text)}`;


    chatbox.appendChild(
        error
    );


    chatbox.scrollTop =
        chatbox.scrollHeight;

}


// ==========================================
// LISTAR CONVERSAS
// ==========================================

async function loadAllChats() {

    const historyContent =
        document.getElementById(
            "historyContent"
        );


    if (!historyContent) {
        return;
    }


    try {

        const response =
            await fetch(
                "/historico/lista/sessoes",
                {

                    headers: {

                        "Authorization":
                            "Bearer " +
                            localStorage.getItem(
                                "token"
                            )

                    }

                }
            );


        if (response.status === 401) {

            logout();

            return;

        }


        const sessoes =
            await response.json();


        historyContent.innerHTML =
            "";


        if (
            !Array.isArray(sessoes) ||
            sessoes.length === 0
        ) {

            historyContent.innerHTML =
                "<p>Nenhum chat salvo.</p>";

            return;

        }


        sessoes.forEach(
            sessao => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "history-item";


                item.innerText =
                    sessao.titulo ||
                    "Conversa sem título";


                item.onclick =
                    () =>
                        loadSpecificChat(
                            sessao._id
                        );


                historyContent.appendChild(
                    item
                );

            }
        );


    } catch (error) {

        console.error(
            "Erro ao carregar chats:",
            error
        );

    }

}


// ==========================================
// ABRIR HISTÓRICO
// ==========================================

async function loadSpecificChat(
    sessionId
) {

    currentSessionId =
        sessionId;


    const chatbox =
        document.getElementById(
            "chatbox"
        );


    if (!chatbox) {
        return;
    }


    hideTyping();


    chatbox.innerHTML =
        "<p>Carregando conversa...</p>";


    try {

        const response =
            await fetch(
                `/historico/${sessionId}`,
                {

                    headers: {

                        "Authorization":
                            "Bearer " +
                            localStorage.getItem(
                                "token"
                            )

                    }

                }
            );


        if (response.status === 401) {

            logout();

            return;

        }


        const mensagens =
            await response.json();


        chatbox.innerHTML =
            "";


        if (
            !Array.isArray(mensagens)
        ) {

            chatbox.innerHTML =
                "<p>Erro ao carregar conversa.</p>";

            return;

        }


        mensagens.forEach(
            msg => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    msg.role === "user"
                        ? "message user"
                        : "message bot";


                const nome =
                    msg.role === "user"
                        ? "Você"
                        : "Gemini";


                let conteudo =
                    `<b>${nome}:</b><br>`;


                // ==================================
                // MOSTRAR IMAGEM
                // ==================================

                if (
                    msg.image &&
                    msg.image.data &&
                    msg.image.mimeType
                ) {

                    const imageSrc =
                        `data:${msg.image.mimeType};base64,${msg.image.data}`;


                    conteudo += `
                        <img
                            src="${imageSrc}"
                            class="chat-image"
                            alt="Imagem enviada"
                        >
                    `;

                }


                // ==================================
                // MOSTRAR TEXTO
                // ==================================

                if (msg.text) {

                    conteudo +=
                        `<br>${msg.role === "user"
                            ? escapeHtml(msg.text)
                            : formatBotResponse(msg.text)
                        }`;

                }


                div.innerHTML =
                    conteudo;


                chatbox.appendChild(
                    div
                );

            }
        );


        chatbox.scrollTop =
            chatbox.scrollHeight;


    } catch (error) {

        console.error(
            "Erro ao carregar histórico:",
            error
        );


        chatbox.innerHTML =
            "<p>Erro ao carregar mensagens.</p>";

    }

}


// ==========================================
// APAGAR CONVERSA
// ==========================================

async function clearCurrentHistory() {

    if (!currentSessionId) {
        return;
    }


    if (
        !confirm(
            "Deseja apagar esta conversa?"
        )
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `/historico/${currentSessionId}`,
                {

                    method: "DELETE",

                    headers: {

                        "Authorization":
                            "Bearer " +
                            localStorage.getItem(
                                "token"
                            )

                    }

                }
            );


        if (response.status === 401) {

            logout();

            return;

        }


        startNewChat();

        loadAllChats();


    } catch (error) {

        console.error(
            "Erro ao apagar conversa:",
            error
        );


        showError(
            "Erro ao apagar conversa."
        );

    }

}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem(
        "token"
    );


    localStorage.removeItem(
        "user"
    );


    localStorage.removeItem(
        "sessionId"
    );


    window.location.href =
        "/login.html";

}


// ==========================================
// SIDEBAR
// ==========================================

function toggleSidebar() {

    const sidebar =
        document.getElementById(
            "sidebarMenu"
        );


    const overlay =
        document.getElementById(
            "modalOverlay"
        );


    if (sidebar) {

        sidebar.classList.toggle(
            "active"
        );

    }


    if (overlay) {

        overlay.classList.toggle(
            "active"
        );

    }

}