
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


function getInitials(name) {

    if (!name) return "U";

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
    function(event) {

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

window.onload = function() {

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


    if (!chatbox) return;


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


    const status =
        document.getElementById("chat-status");


    if (status) {

        status.innerText =
            "Conversa Ativa";

    }


    hideTyping();

    removeSelectedFile();

}


// ==========================================
// INDICADOR DIGITANDO
// ==========================================

function showTyping() {

    const bubble =
        document.getElementById("typingBubble");


    if (bubble) {

        bubble.style.display =
            "flex";

    }

}


function hideTyping() {

    const bubble =
        document.getElementById("typingBubble");


    if (bubble) {

        bubble.style.display =
            "none";

    }

}


// ==========================================
// ENVIAR MENSAGEM
// ==========================================


// ==========================================
// ENVIAR MENSAGEM
// ==========================================

async function sendMessage() {

    console.log("=================================");
    console.log("SEND MESSAGE FOI CHAMADO");
    console.log("=================================");


    const input =
        document.getElementById("userInput");

    const chatbox =
        document.getElementById("chatbox");

    const fileInput =
        document.getElementById("fileInput");


    console.log("input:", input);
    console.log("fileInput:", fileInput);


    if (!input) {

        console.error(
            "ERRO: elemento #userInput não encontrado."
        );

        return;
    }


    if (!chatbox) {

        console.error(
            "ERRO: elemento #chatbox não encontrado."
        );

        return;
    }


    // PEGAR A PERGUNTA

    const pergunta =
        input.value.trim();


    console.log(
        "PERGUNTA CAPTURADA:",
        JSON.stringify(pergunta)
    );


    // PEGAR ARQUIVO

    let arquivo = null;


    if (
        fileInput &&
        fileInput.files &&
        fileInput.files.length > 0
    ) {

        arquivo =
            fileInput.files[0];

    }


    console.log(
        "ARQUIVO:",
        arquivo
            ? arquivo.name
            : "Nenhum arquivo"
    );


    // ================================
    // VERIFICAR PERGUNTA
    // ================================

    if (!pergunta) {

        console.log(
            "A pergunta está vazia."
        );

        showError(
            "Digite uma pergunta."
        );

        return;
    }


    // ================================
    // REMOVER MENSAGEM DE BOAS-VINDAS
    // ================================

    const welcome =
        document.getElementById(
            "welcome-msg"
        );


    if (welcome) {

        welcome.remove();

    }


    // ================================
    // MOSTRAR PERGUNTA DO USUÁRIO
    // ================================

    const userDiv =
        document.createElement("div");


    userDiv.className =
        "message user";


    userDiv.innerHTML =
        `<b>Você:</b><br>
        ${escapeHtml(pergunta)}`;


    if (arquivo) {

        userDiv.innerHTML +=
            `<br>
            <small>
                📎 ${escapeHtml(arquivo.name)}
            </small>`;

    }


    chatbox.appendChild(
        userDiv
    );


    // LIMPAR INPUT

    input.value = "";


    showTyping();


    try {

        let response;


        // ==================================================
        // PDF / TXT
        // ==================================================

        if (arquivo) {

            console.log(
                "================================="
            );

            console.log(
                "ENVIANDO DOCUMENTO"
            );

            console.log(
                "================================="
            );


            const formData =
                new FormData();


            formData.append(
                "documento",
                arquivo
            );


            formData.append(
                "pergunta",
                pergunta
            );


            console.log(
                "Arquivo enviado:",
                arquivo.name
            );


            console.log(
                "Pergunta enviada:",
                pergunta
            );


            response =
                await fetch(
                    "/api/perguntar-documento",
                    {

                        method: "POST",

                        headers: {

                            Authorization:
                                "Bearer " +
                                localStorage.getItem(
                                    "token"
                                )

                        },

                        body: formData

                    }
                );

        }


        // ==================================================
        // CHAT NORMAL
        // ==================================================

        else {

            console.log(
                "Enviando mensagem normal..."
            );


            response =
                await fetch(
                    "/chat",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            Authorization:
                                "Bearer " +
                                localStorage.getItem(
                                    "token"
                                )

                        },

                        body:
                            JSON.stringify({

                                message:
                                    pergunta,

                                sessionId:
                                    currentSessionId

                            })

                    }
                );

        }


        console.log(
            "STATUS DO SERVIDOR:",
            response.status
        );


        // Tentar ler resposta

        const data =
            await response.json();


        console.log(
            "RESPOSTA DO SERVIDOR:",
            data
        );


        hideTyping();


        // ================================
        // TOKEN EXPIRADO
        // ================================

        if (
            response.status === 401
        ) {

            logout();

            return;

        }


        // ==================================================
        // RESPOSTA DO DOCUMENTO
        // ==================================================

        if (arquivo) {

            if (
                response.ok &&
                data.resposta
            ) {

                const botDiv =
                    document.createElement(
                        "div"
                    );


                botDiv.className =
                    "message bot";


                botDiv.innerHTML =
                    `<b>NathanBot:</b><br>
                    ${escapeHtml(
                        data.resposta
                    )}`;


                chatbox.appendChild(
                    botDiv
                );


                console.log(
                    "Documento respondido com sucesso."
                );


            } else {

                console.error(
                    "Erro retornado pelo servidor:",
                    data
                );


                showError(
                    data.erro ||
                    data.error ||
                    "Erro ao analisar o documento."
                );

            }

        }


        // ==================================================
        // RESPOSTA NORMAL
        // ==================================================

        else {

            if (
                response.ok &&
                data.reply
            ) {

                const botDiv =
                    document.createElement(
                        "div"
                    );


                botDiv.className =
                    "message bot";


                botDiv.innerHTML =
                    `<b>NathanBot:</b><br>
                    ${escapeHtml(
                        data.reply
                    )}`;


                chatbox.appendChild(
                    botDiv
                );


                loadAllChats();


            } else {

                showError(
                    data.error ||
                    data.erro ||
                    "Erro ao gerar resposta."
                );

            }

        }


        // ================================
        // REMOVER ARQUIVO
        // ================================

        if (arquivo) {

            removeSelectedFile();

        }


    } catch (error) {

        console.error(
            "ERRO AO ENVIAR:",
            error
        );


        hideTyping();


        showError(
            "Não foi possível conectar ao servidor."
        );

    }


    chatbox.scrollTop =
        chatbox.scrollHeight;

}




// ==========================================
// REMOVER ARQUIVO SELECIONADO
// ==========================================

function removeSelectedFile() {

    const fileInput =
        document.getElementById("fileInput");


    const selectedFile =
        document.getElementById("selectedFile");


    const selectedFileName =
        document.getElementById("selectedFileName");


    if (fileInput) {

        fileInput.value = "";

    }


    if (selectedFileName) {

        selectedFileName.textContent = "";

    }


    if (selectedFile) {

        selectedFile.style.display =
            "none";

    }

}


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
// ERRO
// ==========================================

function showError(text) {

    const chatbox =
        document.getElementById("chatbox");


    if (!chatbox) return;


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


    if (!historyContent) return;


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


    if (!chatbox) return;


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


                div.innerHTML =
                    `<b>${nome}:</b><br>
                    ${escapeHtml(msg.text)}`;


                chatbox.appendChild(
                    div
                );

            }
        );


        chatbox.scrollTop =
            chatbox.scrollHeight;


    } catch (error) {

        console.error(error);


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

        console.error(error);


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

// ==========================================
// TESTE DO BOTÃO
// ==========================================

console.log("=================================");
console.log("SCRIPT.JS CARREGADO");
console.log("=================================");


// ==========================================
// MONITORAR O INPUT
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    const input =
        document.getElementById("userInput");

    const fileInput =
        document.getElementById("fileInput");


    console.log(
        "userInput encontrado:",
        !!input
    );


    console.log(
        "fileInput encontrado:",
        !!fileInput
    );


    if (input) {

        input.addEventListener(
            "input",
            function () {

                console.log(
                    "Texto digitado:",
                    this.value
                );

            }
        );

    }


    if (fileInput) {

        fileInput.addEventListener(
            "change",
            function () {

                console.log(
                    "Arquivo selecionado:",
                    this.files[0]
                        ? this.files[0].name
                        : "nenhum"
                );


                const selectedFile =
                    document.getElementById(
                        "selectedFile"
                    );


                const selectedFileName =
                    document.getElementById(
                        "selectedFileName"
                    );


                if (
                    this.files.length > 0
                ) {

                    selectedFileName.textContent =
                        "📄 " +
                        this.files[0].name;


                    selectedFile.style.display =
                        "flex";

                }

            }
        );

    }

});
