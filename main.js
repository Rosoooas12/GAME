document.addEventListener('DOMContentLoaded', () => {
    const revealButton = document.getElementById('revealButton');
    const secretMessage = document.getElementById('secretMessage');

    if (revealButton && secretMessage) {
        revealButton.addEventListener('click', () => {
            secretMessage.classList.remove('hidden'); // Remove a classe 'hidden' para mostrar a mensagem
            revealButton.style.display = 'none'; // Esconde o botão após clicar
        });
    }
});