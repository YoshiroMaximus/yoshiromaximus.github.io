const themeToggleButton = document.getElementById('theme-toggle');
const body = document.body;

themeToggleButton.addEventListener('click', () => {
    const isDarkMode = body.classList.toggle('dark-mode');
    themeToggleButton.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
});
