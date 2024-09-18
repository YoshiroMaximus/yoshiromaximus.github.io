// Query all elements with the 'clickable' class once the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    const clickableElements = document.querySelectorAll('.clickable');

    // Add event listeners directly without waiting for DOMContentLoaded
    clickableElements.forEach(element => {
        // Hover effect using classList.toggle()
        element.addEventListener('mouseenter', function () {
            element.classList.toggle('hover');
        });

        // Click effect using classList.toggle()
        element.addEventListener('mousedown', function () {
            element.classList.toggle('click');
        });

        // Optional: Remove 'hover' and 'click' classes on mouseleave and mouseup
        element.addEventListener('mouseleave', function () {
            element.classList.remove('hover');
        });
        element.addEventListener('mouseup', function () {
            element.classList.remove('click');
        });
    });

    // Example of event delegation for mousedown event
    document.addEventListener('mousedown', function (event) {
        if (event.target.matches('.clickable')) {
            event.target.classList.toggle('click');
        }
    });
});
