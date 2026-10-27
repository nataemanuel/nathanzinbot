// ==========================================
// VERIFICAR LOGIN
// ==========================================

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login.html";
}



let socket = null;
let isPublicRoom = false;

if (token && typeof io !== "undefined") {
    socket = io({
        auth: {
            token: token
        }
    });

    socket.on("connect", () => {
        console.log("Conectado à sala em tempo real.");
    });

    socket.on("connect_error", (error) => {
        console.error(
            "Erro na conexão Socket.IO:",
            error.message
        );
    });

    socket.on("mensagemRecebida", (dados) => {
        if (!isPublicRoom) return;

        const chatbox = document.getElementById("chatbox");
        if (!chatbox) return;

        const welcome = document.getElementById("welcome-msg");
        if (welcome) welcome.remove();

        const div = document.createElement("div");

        div.className =
            dados.role === "assistant"
                ? "message bot"
                : "message user";

        const nome = document.createElement("b");
        nome.textContent = (dados.userName || "Usuário") + ":";

        const texto = document.createElement("div");
        
        // MODIFICAÇÃO: Renderiza Markdown nas mensagens recebidas via socket se for o bot
        if (dados.role === "assistant") {
            texto.className = "message-body";
            texto.innerHTML = typeof marked !== "undefined" && typeof DOMPurify !== "undefined"
                ? DOMPurify.sanitize(marked.parse(dados.text || ""))
                : escapeHtml(dados.text || "");
        } else {
            texto.textContent = dados.text || "";
        }

        div.appendChild(nome);
        div.appendChild(document.createElement("br"));
        div.appendChild(texto);

        chatbox.appendChild(div);
        chatbox.scrollTop = chatbox.scrollHeight;

        hideTyping();
    });

    socket.on("erroChat", (dados) => {
        showError(
            dados.message || "Erro na sala pública."
        );
    });
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

function togglePublicRoom() {
    const button = document.getElementById("togglePublicRoom");
    const status = document.getElementById("chat-status");
    const chatbox = document.getElementById("chatbox");
    const fileInput = document.getElementById("fileInput");

    if (!socket || !socket.connected) {
        showError(
            "Não foi possível conectar à sala. Verifique sua conexão e tente novamente."
        );
        return;
    }

    isPublicRoom = !isPublicRoom;

    if (isPublicRoom) {
        currentSessionId = "";

        chatbox.innerHTML = "";

        if (button) {
            button.textContent = "Voltar ao chat individual";
        }

        if (status) {
            status.textContent = "Sala pública • Tempo real";
        }

        const aviso = document.createElement("p");
        aviso.id = "welcome-msg";
        aviso.style.textAlign = "center";
        aviso.style.color = "#80868b";
        aviso.textContent =
            "Você entrou na sala pública. Suas mensagens serão visíveis aos participantes.";
        chatbox.appendChild(aviso);

        if (fileInput) fileInput.disabled = true;

        const input = document.getElementById("userInput");
        if (input) {
            input.placeholder = "Mensagem para a sala... Use @gemini para chamar o moderador";
        }

    } else {
        if (button) {
            button.textContent = "Entrar na sala pública";
        }

        if (fileInput) fileInput.disabled = false;

        const input = document.getElementById("userInput");
        if (input) {
            input.placeholder = "Digite sua pergunta aqui...";
        }

        startNewChat();
        loadAllChats();
    }
}


// ==========================================
// ENVIAR MENSAGEM
// ==========================================

async function sendMessage() {
    const input = document.getElementById("userInput");
    const chatbox = document.getElementById("chatbox");
    const fileInput = document.getElementById("fileInput");

    if (!input || !chatbox) return;

    const pergunta = input.value.trim();
    const arquivo = fileInput?.files?.[0] || null;

    if (!pergunta && !arquivo) {
        showError("Digite uma mensagem ou selecione uma foto/arquivo.");
        return;
    }

    if (isPublicRoom) {
        if (arquivo) {
            showError("O envio de arquivos está disponível no chat individual.");
            return;
        }
        if (!socket || !socket.connected) {
            showError("Conexão perdida. Aguarde e tente novamente.");
            return;
        }
        socket.emit("novaMensagem", { text: pergunta });
        input.value = "";
        input.focus();
        return;
    }
    
    // Limpa a prévia assim que o envio começa
    fileInput.value = "";

    const imagePreview = document.getElementById("imagePreview");
    if (imagePreview) {
        imagePreview.innerHTML = "";
    }
    
    const welcome = document.getElementById("welcome-msg");
    if (welcome) welcome.remove();

    const userDiv = document.createElement("div");
    userDiv.className = "message user";
    const userLabel = document.createElement("b");
    userLabel.textContent = "Você:";
    userDiv.appendChild(userLabel);

    if (pergunta) {
        const messageText = document.createElement("div");
        messageText.textContent = pergunta;
        userDiv.appendChild(messageText);
    }

    if (arquivo) {
        const attachment = document.createElement("div");
        attachment.className = "message-attachment";
        attachment.textContent = `📎 ${arquivo.name}`;
        userDiv.appendChild(attachment);

        if (arquivo.type.startsWith("image/")) {
            const imageUrl = URL.createObjectURL(arquivo);
            const preview = document.createElement("img");
            preview.src = imageUrl;
            preview.alt = "Imagem enviada";
            preview.className = "sent-image-preview";
            preview.onload = () => URL.revokeObjectURL(imageUrl);
            userDiv.appendChild(preview);
        }
    }

    chatbox.appendChild(userDiv);
    input.value = "";
    showTyping();

    try {
        let response;

        if (arquivo) {
            const formData = new FormData();
            formData.append("documento", arquivo);
            formData.append("pergunta", pergunta);

            response = await fetch("/api/perguntar-documento", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token") || ""}`
                },
                body: formData
            });
        } else {
            response = await fetch("/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token") || ""}`
                },
                body: JSON.stringify({
                    message: pergunta,
                    sessionId: currentSessionId
                })
            });
        }

        const data = await response.json().catch(() => ({}));
        hideTyping();

        if (response.status === 401) {
            logout();
            return;
        }

        const resposta = arquivo ? data.resposta : data.reply;
        if (!response.ok || !resposta) {
            showError(data.erro || data.error || "Não foi possível obter uma resposta.");
            return;
        }

        const botDiv = document.createElement("div");
        botDiv.className = "message bot";
        
        // MODIFICAÇÃO: Processa o Markdown da resposta do bot de forma segura
        const formattedText = typeof marked !== "undefined" && typeof DOMPurify !== "undefined"
            ? DOMPurify.sanitize(marked.parse(resposta))
            : escapeHtml(resposta);

        botDiv.innerHTML = `<b>NathanBot:</b><div class="message-body">${formattedText}</div>`;
        chatbox.appendChild(botDiv);

        if (!arquivo) loadAllChats();
        removeSelectedFile();
    } catch (error) {
        console.error("Erro ao enviar mensagem/arquivo:", error);
        hideTyping();
        showError("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    }

    chatbox.scrollTop = chatbox.scrollHeight;
}

// ==========================================
// REMOVER ARQUIVO SELECIONADO
// ==========================================

function removeSelectedFile() {
    const fileInput = document.getElementById("fileInput");
    const preview = document.getElementById("imagePreview");
    if (fileInput) fileInput.value = "";
    if (preview) preview.innerHTML = "";
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


                // MODIFICAÇÃO: Renderização correta de Markdown ao carregar mensagens antigas do histórico
                if (msg.role === "user") {
                    div.innerHTML = `<b>Você:</b><div>${escapeHtml(msg.text)}</div>`;
                } else {
                    const formattedText = typeof marked !== "undefined" && typeof DOMPurify !== "undefined"
                        ? DOMPurify.sanitize(marked.parse(msg.text || ""))
                        : escapeHtml(msg.text || "");
                    div.innerHTML = `<b>NathanBot:</b><div class="message-body">${formattedText}</div>`;
                }

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
    const fileInput = document.getElementById("fileInput");
    const preview = document.getElementById("imagePreview");
    const input = document.getElementById("userInput");

    if (fileInput) {
        fileInput.addEventListener("change", function () {
            if (!preview) return;
            preview.innerHTML = "";
            const file = this.files?.[0];
            if (!file) return;

            const row = document.createElement("div");
            row.className = "selected-upload";

            if (file.type.startsWith("image/")) {
                const img = document.createElement("img");
                img.src = URL.createObjectURL(file);
                img.alt = "Prévia da imagem selecionada";
                img.className = "upload-thumbnail";
                row.appendChild(img);
            } else {
                const icon = document.createElement("span");
                icon.className = "upload-file-icon";
                icon.textContent = file.type === "application/pdf" ? "📕" : "📄";
                row.appendChild(icon);
            }

            const name = document.createElement("span");
            name.className = "upload-file-name";
            name.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            row.appendChild(name);

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "remove-upload-button";
            removeButton.textContent = "×";
            removeButton.title = "Remover arquivo";
            removeButton.setAttribute("aria-label", "Remover arquivo selecionado");
            removeButton.addEventListener("click", removeSelectedFile);
            row.appendChild(removeButton);

            preview.appendChild(row);
        });
    }

    if (input) {
        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }
});
