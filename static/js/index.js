window.HELP_IMPROVE_VIDEOJS = false;

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.navbar-burger').forEach(function(burger) {
        burger.addEventListener('click', function() {
            var target = document.getElementById(burger.dataset.target);
            burger.classList.toggle('is-active');
            burger.setAttribute('aria-expanded', String(burger.classList.contains('is-active')));
            if (target) {
                target.classList.toggle('is-active');
            }
        });
    });

    var options = {
        slidesToScroll: 1,
        slidesToShow: 1,
        loop: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 5000,
    };

    if (window.bulmaCarousel) {
        bulmaCarousel.attach('.carousel', options);
    }

    if (window.bulmaSlider) {
        bulmaSlider.attach();
    }
});
