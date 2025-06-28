  // Initialize Notiflix
  Notiflix.Notify.init({
    width: '300px',
    position: 'right-top',
    distance: '20px',
    opacity: 1,
    borderRadius: '5px',
    rtl: false,
    timeout: 3000,
});

// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');

mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileMenuBtn.innerHTML = navLinks.classList.contains('active') ? 
        '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    });
});

// Simple animation for elements when they come into view
document.addEventListener('DOMContentLoaded', function() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__animated', 'animate__fadeInUp');
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.feature-card, .pricing-card, .team-card').forEach(el => {
        observer.observe(el);
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Update copyright year
const copyrightElement = document.getElementById('copyright-text');
const currentYear = new Date().getFullYear();
copyrightElement.textContent = `© ${currentYear} VROOM. All rights reserved.`;

// Form submission handling
document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Show loading indicator
    Notiflix.Loading.standard('Sending message...');
    
    try {
        // Validate inputs
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const subject = document.getElementById('subject').value.trim();
        const message = document.getElementById('message').value.trim();
        
        // Validation checks
        if (!name) {
            Notiflix.Loading.remove();
            Notiflix.Notify.failure('Please enter your name');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Notiflix.Loading.remove();
            Notiflix.Notify.failure('Please enter a valid email address');
            return;
        }
        
        if (!subject) {
            Notiflix.Loading.remove();
            Notiflix.Notify.failure('Please enter a subject');
            return;
        }
        
        if (!message) {
            Notiflix.Loading.remove();
            Notiflix.Notify.failure('Please enter your message');
            return;
        }
        
        // Prepare form data
        const formData = new FormData(this);
        
        // Send form data
        const response = await fetch(this.action, {
            method: this.method,
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // Remove loading indicator
        Notiflix.Loading.remove();
        
        if (response.ok) {
            Notiflix.Notify.success('Message sent successfully!');
            this.reset();
        } else {
            const errorData = await response.json();
            if (errorData.errors) {
                Notiflix.Notify.failure(errorData.errors.map(error => error.message).join(', '));
            } else {
                Notiflix.Notify.failure('There was a problem sending your message. Please try again later.');
            }
        }
    } catch (error) {
        Notiflix.Loading.remove();
        Notiflix.Notify.failure('There was a network error. Please check your connection and try again.');
        console.error('Error:', error);
    }
});