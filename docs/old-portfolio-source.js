// Add this at the start of your main.js
// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Alpine.js Component Initializations
document.addEventListener('alpine:init', () => {
    // Navigation Component
    Alpine.data('navigation', () => ({
        isDark: localStorage.getItem('darkMode') === 'true' || 
                (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches),
        isOpen: false,
        init() {
            // Add this init function to watch for dark mode changes
            this.$watch('isDark', value => {
                if (value) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                localStorage.setItem('darkMode', value.toString());
            });
        },
        toggleMenu() {
            this.isOpen = !this.isOpen;
            document.body.style.overflow = this.isOpen ? 'hidden' : '';
        },
        toggleDark() {
            this.isDark = !this.isDark;
        }
    }));

    // Clipboard Component
Alpine.data('clipboard', () => ({
    copied: false,
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.copied = true;
            setTimeout(() => this.copied = false, 2000);
        });
    }
}));

// Scroll Progress Component
Alpine.data('scrollProgress', () => ({
    percentage: 0,
    init() {
        this.updateProgress(); // Initial calculation
        window.addEventListener('scroll', () => this.updateProgress());
    },
    updateProgress() {
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollTop = window.scrollY;
        this.percentage = Math.min(100, Math.round((scrollTop / docHeight) * 100));
    }
}));

    // Page Transitions Component
    Alpine.data('pageTransitions', () => ({
        init() {
            // Create intersection observer
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            // Add both opacity and animation classes
                            entry.target.classList.remove('opacity-0');
                            entry.target.classList.add('opacity-100');
                            entry.target.classList.add('animate-fadeIn');
                            observer.unobserve(entry.target);
                        }
                    });
                },
                {
                    root: null,
                    rootMargin: '50px',
                    threshold: 0.1
                }
            );

            // Observe all sections
            document.querySelectorAll('section, footer').forEach(element => {
                observer.observe(element);
            });
        }
    }));
});



// Dark mode handling - Initial check
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved dark mode preference or system preference
    if (localStorage.getItem('darkMode') === 'true' || 
        (!localStorage.getItem('darkMode') && 
         window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    // Smooth scroll handling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    const loadVisualizations = () => {
        const visualizations = document.querySelectorAll('.visualization');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const viz = entry.target;
                    if (!viz.dataset.loaded) {
                        // Initialize visualization only when visible
                        switch(viz.id) {
                            case 'skills-network':
                                Alpine.data('skillsNetwork').initNetwork();
                                break;
                            case 'project-timeline':
                                Alpine.data('projectTimeline').initChart();
                                break;
                            case 'dna-viewer':
                                Alpine.data('dnaViewer').initViewer();
                                break;
                        }
                        viz.dataset.loaded = 'true';
                    }
                }
            });
        }, {
            threshold: 0.1
        });

        visualizations.forEach(viz => observer.observe(viz));
    };

    // Delay initialization on mobile
    if (window.innerWidth < 768) {
        setTimeout(loadVisualizations, 1000);
    } else {
        loadVisualizations();
    }

    // Optimize resize handlers
const optimizedResize = debounce(() => {
    if (window.innerWidth < 768) {
        // Limit updates on mobile
        return;
    }
    // Update visualizations
    if (Alpine.data('skillsNetwork')) Alpine.data('skillsNetwork').handleResize();
    if (Alpine.data('projectTimeline')) Alpine.data('projectTimeline').initChart();
    if (Alpine.data('dnaViewer')) Alpine.data('dnaViewer').initViewer();
}, 250);

window.addEventListener('resize', optimizedResize);
});

// Scroll to top button functionality
window.onscroll = function() {
    const scrollButton = document.getElementById('scroll-to-top');
    if (scrollButton) {
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            scrollButton.classList.remove('hidden');
        } else {
            scrollButton.classList.add('hidden');
        }
    }
};

// Mobile menu functionality
function mobileMenu() {
    return {
        show: false,
        toggle() {
            this.show = !this.show;
            document.body.style.overflow = this.show ? 'hidden' : '';
        }
    };
}

// Reading Time Estimation
function calculateReadingTime() {
    return {
        readingTime: 0,
        init() {
            // Get all text content from main sections
            const content = document.querySelector('main').innerText;
            const wordsPerMinute = 260; // Average reading speed
            const words = content.trim().split(/\s+/).length;
            this.readingTime = Math.ceil(words / wordsPerMinute);
            
            // Log for debugging
            console.log('Word count:', words);
            console.log('Reading time:', this.readingTime);
        }
    };
}

// Contact form functionality
function contactForm() {
    return {
        form: {
            firstName: '',
            lastName: '',
            email: '',
            subject: '',
            message: ''
        },
        errors: {},
        loading: false,
        formStatus: {
            show: false,
            success: false,
            message: ''
        },
        attempts: 0,
        hasSubmittedLink: false,
        showRecaptcha: false,
        recaptchaVerified: false,
        
        get submissionCount() {
            return parseInt(localStorage.getItem('formSubmissionCount') || '0');
        },
        
        init() {
            window.contactFormComponent = this;
            const lastSubmitTime = localStorage.getItem('lastSubmitTime');
            if (lastSubmitTime && (Date.now() - parseInt(lastSubmitTime)) > 86400000) {
                localStorage.setItem('formSubmissionCount', '0');
            }
        },

        validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },

        containsLinks(text) {
            const linkPatterns = [
                /https?:\/\/[^\s]+/i,
                /www\.[^\s]+/i,
                /[^\s]+\.[a-z]{2,}/i
            ];
            return linkPatterns.some(pattern => pattern.test(text));
        },

        containsEmails(text) {
            const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            return emailPattern.test(text);
        },
        
        validateForm() {
            this.errors = {};
            
            if (this.submissionCount >= 5) {
                this.errors.general = 'Maximum daily submission limit reached. Please try again tomorrow.';
                return false;
            }

            if (this.hasSubmittedLink && this.attempts > 1) {
                this.errors.general = 'You have been temporarily blocked due to suspicious activity.';
                return false;
            }

            if (!this.form.firstName.trim()) {
                this.errors.firstName = 'First name is required';
            }
            
            if (!this.form.lastName.trim()) {
                this.errors.lastName = 'Last name is required';
            }
            
            if (!this.form.email.trim()) {
                this.errors.email = 'Email is required';
            } else if (!this.validateEmail(this.form.email)) {
                this.errors.email = 'Please enter a valid email address';
            }
            
            const message = this.form.message.trim();
            if (!message) {
                this.errors.message = 'Message is required';
            } else if (message.length < 10) {
                this.errors.message = 'Message must be at least 10 characters long';
            } else if (this.containsLinks(message)) {
                this.errors.message = 'Please do not include links in your message';
                this.hasSubmittedLink = true;
                this.attempts++;
                return false;
            } else if (this.containsEmails(message)) {
                this.errors.message = 'Please do not include email addresses in the message field';
            }
            
            return Object.keys(this.errors).length === 0;
        },

        validateAndShowRecaptcha(event) {
            if (this.validateForm()) {
                this.showRecaptcha = true;
            }
        },
        
        async submitFormspree(form) {
            if (!this.validateForm()) {
                return;
            }
            
            this.loading = true;
            
            try {
                const currentCount = this.submissionCount;
                if (currentCount >= 5) {
                    throw new Error('Maximum daily submission limit reached');
                }

                const response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    localStorage.setItem('formSubmissionCount', (currentCount + 1).toString());
                    localStorage.setItem('lastSubmitTime', Date.now().toString());

                    this.formStatus = {
                        show: true,
                        success: true,
                        message: 'Thank you for your message! I will get back to you soon.'
                    };
                    this.resetForm();
                    grecaptcha.reset();
                } else {
                    throw new Error('Failed to send message');
                }
            } catch (error) {
                this.formStatus = {
                    show: true,
                    success: false,
                    message: error.message || 'Sorry, there was an error sending your message. Please try again later.'
                };
            } finally {
                this.loading = false;
                this.$el.scrollIntoView({ behavior: 'smooth' });
            }
        },

        onRecaptchaSuccess() {
            try {
                this.recaptchaVerified = true;
                this.showRecaptcha = false;
                this.submitFormspree(this.$el);
            } catch (error) {
                console.error('Error in captcha success:', error);
            }
            
        },
        
        resetForm() {
            this.form = {
                firstName: '',
                lastName: '',
                email: '',
                subject: '',
                message: ''
            };
            this.errors = {};
            this.showRecaptcha = false;
            this.recaptchaVerified = false;
        }
    };
}

function onRecaptchaSuccess(token) {
    setTimeout(() => {
        try {
            if (!window.contactFormComponent) {
                console.error('Contact form component not found');
            }
            
            // Use the stored reference to call the method
            window.contactFormComponent.onRecaptchaSuccess();
        } catch (error) {
            console.error('Error in reCAPTCHA callback:', error);
        }
    }, 100);
}

// We can create a simple interactive DNA sequence viewer
function initDNAViewer() {
    const sequence = "ATCGATCG..."; // Example sequence
    const viewer = d3.select("#dna-viewer")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%");
    
    // We'll implement the full visualization logic next
}

// Force-directed graph showing relationships between skills
/*
function initSkillsNetwork() {
    const data = {
        nodes: [
            { id: "Python", group: 1 },
            { id: "Bioinformatics", group: 1 },
            { id: "Data Analysis", group: 2 },
            // More nodes...
        ],
        links: [
            { source: "Python", target: "Bioinformatics", value: 1 },
            { source: "Data Analysis", target: "Python", value: 2 },
            // More links...
        ]
    };
    // We'll implement the full D3.js force-directed graph next
}
*/


// Timeline visualization showing project progression
/*
function initProjectTimeline() {
    const projects = [
        { name: "GPTPortal", start: "2024-01", end: "2024-03" },
        { name: "Portfolio Website", start: "2024-02", end: "2024-04" },
        // More projects...
    ];
    // We'll implement the full timeline visualization next
}
*/



// Language Proficiency Chart
document.addEventListener('alpine:init', () => {
    Alpine.data('languageChart', () => ({
        chart: null,
        init() {
            this.initChart();
            // Watch for dark mode changes
            this.$watch('$store.darkMode', () => {
                this.updateChartTheme();
            });
        },
        initChart() {
            const ctx = document.getElementById('languageChart');
            if (!ctx) return;

            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#e5e7eb' : '#374151';
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

            this.chart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: [
                        'Python',
                        'JavaScript',
                        'R',
                        'TypeScript',
                        'Rust',
                        'Java',
                        'HTML/CSS',
                        'Node.js'
                    ],
                    datasets: [{
                        label: 'Current Proficiency',
                        data: [90, 95, 75, 45, 40, 40, 85, 90],
                        fill: true,
                        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        borderColor: isDark ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)',
                        pointBackgroundColor: isDark ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: isDark ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animations: {
                        tension: {
                            duration: 1000,
                            easing: 'linear',
                            from: 0.8,
                            to: 0.2,
                            loop: true
                        }
                    },
                    scales: {
                        r: {
                            angleLines: {
                                color: gridColor
                            },
                            grid: {
                                color: gridColor
                            },
                            pointLabels: {
                                color: textColor,
                                font: {
                                    size: 12,
                                    family: "'Inter', sans-serif"
                                }
                            },
                            ticks: {
                                color: textColor,
                                backdropColor: 'transparent',
                                font: {
                                    size: 10
                                },
                                beginAtZero: true,
                                min: 0,
                                max: 100,
                                stepSize: 20,
                                showLabelBackdrop: false
                            },
                            suggestedMin: 0,
                            suggestedMax: 100
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            titleColor: isDark ? '#fff' : '#000',
                            bodyColor: isDark ? '#fff' : '#000',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            borderWidth: 1,
                            padding: 10,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    return `Proficiency: ${context.raw}%`;
                                }
                            }
                        }
                    }
                }
            });
        },
        updateChartTheme() {
            if (!this.chart) return;
            
            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#e5e7eb' : '#374151';
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

            // Update colors
            this.chart.data.datasets[0].backgroundColor = isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.2)';
            this.chart.data.datasets[0].borderColor = isDark ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)';
            this.chart.data.datasets[0].pointBackgroundColor = isDark ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)';
            
            // Update scales
            this.chart.options.scales.r.angleLines.color = gridColor;
            this.chart.options.scales.r.grid.color = gridColor;
            this.chart.options.scales.r.pointLabels.color = textColor;
            this.chart.options.scales.r.ticks.color = textColor;

            // Update tooltip
            this.chart.options.plugins.tooltip.backgroundColor = isDark ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)';
            this.chart.options.plugins.tooltip.titleColor = isDark ? '#fff' : '#000';
            this.chart.options.plugins.tooltip.bodyColor = isDark ? '#fff' : '#000';
            this.chart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

            this.chart.update();
        }
    }));
});


// Skills Network Visualization
document.addEventListener('alpine:init', () => {
    Alpine.data('skillsNetwork', () => ({
        network: null,
        simulation: null,
        svg: null,
        width: 0,
        height: 0,

        init() {
            this.initNetwork();
            // Watch for dark mode changes
            this.$watch('$store.darkMode', () => {
                this.updateNetworkTheme();
            });
            // Watch for container resize
            window.addEventListener('resize', this.handleResize.bind(this));
        },

        handleResize() {
            const container = document.getElementById('skills-network');
            if (container) {
                this.width = container.clientWidth;
                this.height = container.clientHeight;
                this.updateNetworkSize();
            }
        },

        initNetwork() {
            const container = document.getElementById('skills-network');
            if (!container) return;

            this.width = container.clientWidth;
            this.height = container.clientHeight;

            // Clear any existing SVG
            d3.select('#skills-network svg').remove();

            // Create new SVG
            this.svg = d3.select('#skills-network')
                .append('svg')
                .attr('width', this.width)
                .attr('height', this.height);

            // Add zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.5, 2])
                .on('zoom', (event) => {
                    this.svg.select('g').attr('transform', event.transform);
                });

            this.svg.call(zoom);

            // Create the network data
            const data = {
                nodes: [
                    // Core Skills
                    { id: "Bioinformatics", group: "core", size: 20 },
                    { id: "Programming", group: "core", size: 20 },
                    { id: "Web Development", group: "core", size: 20 },
                    { id: "AI/ML", group: "core", size: 20 },
                    { id: "Research", group: "core", size: 20 },
                    
                    // Programming Languages
                    { id: "Python", group: "programming", size: 15 },
                    { id: "JavaScript", group: "programming", size: 15 },
                    { id: "TypeScript", group: "programming", size: 12 },
                    { id: "R", group: "programming", size: 15 },
                    { id: "Java", group: "programming", size: 10 },
                    { id: "Rust", group: "programming", size: 10 },
                    
                    // Technologies
                    { id: "ReactJS", group: "tech", size: 14 },
                    { id: "Node.js", group: "tech", size: 14 },
                    { id: "HTML/CSS", group: "tech", size: 14 },
                    { id: "Tailwind CSS", group: "tech", size: 12 },
                    { id: "Alpine.js", group: "tech", size: 12 },
                    
                    // Biotech Skills
                    { id: "DNA Analysis", group: "biotech", size: 12 },
                    { id: "Genomics", group: "biotech", size: 12 },
                    { id: "Epigenetics", group: "biotech", size: 12 },
                    { id: "BioPython", group: "biotech", size: 10 },
                    
                    // Data Analysis
                    { id: "Data Visualization", group: "data", size: 14 },
                    { id: "Statistical Analysis", group: "data", size: 12 },
                    { id: "ggplot2", group: "data", size: 10 },
                    { id: "Pandas", group: "data", size: 12 },
                    { id: "NumPy", group: "data", size: 12 },
                    
                    // Tools
                    { id: "Git", group: "tools", size: 10 },
                    { id: "VS Code", group: "tools", size: 10 },
                    { id: "Obsidian.md", group: "tools", size: 10 },
                    { id: "Jupyter", group: "tools", size: 10 },
                    
                    // AI/ML
                    { id: "LLM Integration", group: "ai", size: 14 },
                    { id: "Vector Embeddings", group: "ai", size: 12 },
                    { id: "API Integration", group: "ai", size: 12 }
                ],
                links: [
                    // Core connections
                    { source: "Bioinformatics", target: "Programming", value: 8 },
                    { source: "Bioinformatics", target: "Research", value: 8 },
                    { source: "Programming", target: "Web Development", value: 8 },
                    { source: "Programming", target: "AI/ML", value: 8 },
                    { source: "AI/ML", target: "Research", value: 6 },
                    
                    // Programming Language connections
                    { source: "Programming", target: "Python", value: 8 },
                    { source: "Programming", target: "JavaScript", value: 8 },
                    { source: "Programming", target: "TypeScript", value: 5 },
                    { source: "Programming", target: "R", value: 7 },
                    { source: "Programming", target: "Java", value: 4 },
                    { source: "Programming", target: "Rust", value: 4 },
                    
                    // Tech connections
                    { source: "Web Development", target: "ReactJS", value: 7 },
                    { source: "Web Development", target: "Node.js", value: 7 },
                    { source: "Web Development", target: "HTML/CSS", value: 7 },
                    { source: "Web Development", target: "Tailwind CSS", value: 6 },
                    { source: "Web Development", target: "Alpine.js", value: 6 },
                    { source: "JavaScript", target: "ReactJS", value: 6 },
                    { source: "TypeScript", target: "ReactJS", value: 6 },
                    { source: "JavaScript", target: "Node.js", value: 6 },
                    
                    // Bioinformatics connections
                    { source: "Bioinformatics", target: "DNA Analysis", value: 7 },
                    { source: "Bioinformatics", target: "Genomics", value: 7 },
                    { source: "Bioinformatics", target: "Epigenetics", value: 7 },
                    { source: "Python", target: "BioPython", value: 5 },
                    { source: "BioPython", target: "DNA Analysis", value: 5 },
                    
                    // Data Analysis connections
                    { source: "Python", target: "Data Visualization", value: 6 },
                    { source: "R", target: "Data Visualization", value: 6 },
                    { source: "Data Visualization", target: "Statistical Analysis", value: 5 },
                    { source: "R", target: "ggplot2", value: 6 },
                    { source: "R", target: "Statistical Analysis", value: 6 },
                    { source: "Python", target: "Pandas", value: 6 },
                    { source: "Python", target: "NumPy", value: 6 },
                    
                    // Tool connections
                    { source: "Programming", target: "Git", value: 4 },
                    { source: "Programming", target: "VS Code", value: 4 },
                    { source: "Research", target: "Obsidian.md", value: 5 },
                    { source: "Python", target: "Jupyter", value: 5 },
                    
                    // AI/ML connections
                    { source: "AI/ML", target: "LLM Integration", value: 7 },
                    { source: "AI/ML", target: "Vector Embeddings", value: 6 },
                    { source: "AI/ML", target: "API Integration", value: 6 },
                    { source: "Node.js", target: "API Integration", value: 5 }
                ]
            };

            // Color scale for different groups
            const color = d3.scaleOrdinal()
                .domain(["core", "programming", "tech", "biotech", "data", "tools", "ai"])
                .range(["#3B82F6", "#10B981", "#8B5CF6", "#6366F1", "#F59E0B", "#64748B", "#EC4899"]);

            // Create force simulation
            this.simulation = d3.forceSimulation(data.nodes)
                .force("link", d3.forceLink(data.links)
                    .id(d => d.id)
                    .distance(d => 125 - d.value * 3))
                .force("charge", d3.forceManyBody()
                    .strength(-300)
                    .distanceMax(300))
                .force("center", d3.forceCenter(this.width * 0.45, this.height / 2))
                .force("collision", d3.forceCollide().radius(d => d.size * 2.5))
                .force("x", d3.forceX(this.width * 0.45).strength(0.05))
                .force("y", d3.forceY(this.height / 2).strength(0.05));

            // Create container group
            const g = this.svg.append("g");

            // Create links
            const links = g.append("g")
                .selectAll("line")
                .data(data.links)
                .join("line")
                .attr("stroke-width", d => Math.sqrt(d.value))
                .attr("stroke", "rgba(156, 163, 175, 0.6)");

            // Create nodes
            const nodes = g.append("g")
                .selectAll("g")
                .data(data.nodes)
                .join("g")
                .call(d3.drag()
                    .on("start", this.dragstarted.bind(this))
                    .on("drag", this.dragged.bind(this))
                    .on("end", this.dragended.bind(this)));

            // Add circles to nodes
            nodes.append("circle")
                .attr("r", d => d.size)
                .attr("fill", d => color(d.group))
                .attr("stroke", "#fff")
                .attr("stroke-width", 2);

            // Add labels to nodes
            nodes.append("text")
                .text(d => d.id)
                .attr("x", d => d.size + 8)
                .attr("y", 4)
                .attr("font-size", "13px")
                .attr("font-weight", d => d.group === "core" ? "600" : "400")
                .attr("fill", this.isDarkMode() ? "#e5e7eb" : "#374151");

            // Update positions on tick
            this.simulation.on("tick", () => {
                links
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                nodes
                    .attr("transform", d => `translate(${d.x},${d.y})`);
            });

            // Store references
            this.network = { nodes, links };
        },

        isDarkMode() {
            return document.documentElement.classList.contains('dark');
        },

        updateNetworkTheme() {
            if (!this.network) return;
            
            const textColor = this.isDarkMode() ? "#e5e7eb" : "#374151";
            this.network.nodes.selectAll("text")
                .attr("fill", textColor);
        },

        updateNetworkSize() {
            if (!this.svg || !this.simulation) return;
            
            this.svg
                .attr("width", this.width)
                .attr("height", this.height);
                
            this.simulation
                .force("center", d3.forceCenter(this.width / 2, this.height / 2))
                .restart();
        },

        dragstarted(event, d) {
            if (!event.active) this.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        },

        dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        },

        dragended(event, d) {
            if (!event.active) this.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }));
});

// Project Timeline Visualization
document.addEventListener('alpine:init', () => {
    Alpine.data('projectTimeline', () => ({
        chart: null,
        zoom: null,
        tooltipData: {
            name: '',
            description: '',
            completion: 0,
            dates: '',
            category: ''
        },
        resizeObserver: null,

        init() {
            this.initChart();
            
            this.resizeObserver = new ResizeObserver(entries => {
                this.initChart();
            });
            this.resizeObserver.observe(this.$el);
            
            this.$watch('$store.darkMode', () => {
                this.updateChartTheme();
            });
        },

        destroyed() {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
        },

        initChart() {
            const projects = [
                {
                    id: "gptportal",
                    name: "GPTPortal",
                    startDate: "2023-06",
                    endDate: "2025-01",
                    completion: 90,
                    category: "AI/ML",
                    description: "Advanced LLM interface integrating 10+ AI providers with multi-modal interactions, custom instructions, and RAG capabilities."
                },
                {
                    id: "epigenai",
                    name: "EpiGenAI Portal",
                    startDate: "2023-08", 
                    endDate: "2024-01",
                    completion: 80,
                    category: "Bioinformatics",
                    description: "Specialized portal for epigenetic data analysis using vector embeddings and LLMs for DNA methylation analysis."
                },
                {
                    id: "webreg",
                    name: "WebReg Auto-Enroller",
                    startDate: "2023-11",
                    endDate: "2024-01",
                    completion: 100,
                    category: "Rust\nDevelopment",
                    description: "Robust Rust application that monitors UCSD's WebReg system for course openings with asynchronous execution."
                },
                {
                    id: "ao3exporter",
                    name: "AO3 History Exporter",
                    startDate: "2025-03",
                    endDate: "2025-03",
                    completion: 100,
                    category: "Web\nDevelopment",
                    description: "Cross-compatible extension to export AO3 browsing history with dynamic DOM parsing and JSON formatting."
                },
                {
                    id: "ao3explorer",
                    name: "AO3 History Explorer",
                    startDate: "2024-03",
                    endDate: "2024-03",
                    completion: 100,
                    category: "Web\nDevelopment",
                    description: "React Web Application with TypeScript to analyze AO3 history with interactive tables and visualizations."
                },
                {
                    id: "crime",
                    name: "Crime Analysis Pipeline",
                    startDate: "2025-02",
                    endDate: "2025-03",
                    completion: 100,
                    category: "Data Analysis",
                    description: "R-based data pipeline visualizing relationships between political leaning, incarceration, and crime rates."
                },
                {
                    id: "portfolio",
                    name: "Portfolio Website",
                    startDate: "2023-09",
                    endDate: "2024-03",
                    completion: 100,
                    category: "Web\nDevelopment",
                    description: "Modern portfolio website built with HTML5, Tailwind CSS, and Alpine.js featuring responsive design and interactive elements."
                },
                {
                    id: "genomics",
                    name: "Genomic Analysis Tool",
                    startDate: "2024-01",
                    endDate: "2024-02",
                    completion: 80,
                    category: "Bioinformatics",
                    description: "Python-based genomic analysis tool for processing and visualizing DNA sequence data."
                },
                {
                    id: "todo",
                    name: "React To-Do App",
                    startDate: "2025-01",
                    endDate: "2024-02",
                    completion: 100,
                    category: "Web\nDevelopment",
                    description: "Advanced React-based To-Do application with task categorization, priorities, and voice commands."
                },
                {
                    id: "bild4",
                    name: "BILD4 Research Project",
                    startDate: "2023-09",
                    endDate: "2023-12",
                    completion: 100,
                    category: "Research",
                    description: "Research exploring epigenetic effects of alcohol consumption in Asian populations focusing on DNA hypomethylation."
                }
            ];

            const container = document.getElementById('project-timeline');
            if (!container) return;

            container.innerHTML = '';

            const margin = { top: 30, right: 60, bottom: 60, left: 160 };
            const width = container.clientWidth - margin.left - margin.right;
            const height = container.clientHeight - margin.top - margin.bottom;

            const svg = d3.select(container)
                .append('svg')
                .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
                .attr('width', '100%')
                .attr('height', '100%');

            this.zoom = d3.zoom()
                .scaleExtent([0.5, 2])
                .on('zoom', (event) => {
                    mainGroup.attr('transform', event.transform);
                });

            svg.call(this.zoom);

            const mainGroup = svg.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const initialTransform = d3.zoomIdentity
                .translate(margin.left, margin.top)
                .scale(0.95);
            svg.call(this.zoom.transform, initialTransform);

            const timeScale = d3.scaleTime()
                .domain([new Date('2023-06'), new Date('2024-03')])
                .range([0, width]);

            const categories = ['Web\nDevelopment', 'AI/ML', 'Bioinformatics', 'Research', 'Data Analysis', 'Rust\nDevelopment'];
            const categoryScale = d3.scaleBand()
                .domain(categories)
                .range([0, height])
                .padding(0.4);

            mainGroup.selectAll('.category-bg')
                .data(categories)
                .join('rect')
                .attr('class', 'category-bg')
                .attr('x', -margin.left)
                .attr('y', d => categoryScale(d))
                .attr('width', width + margin.left + margin.right)
                .attr('height', categoryScale.bandwidth())
                .attr('fill', this.isDarkMode() ? '#1F2937' : '#F3F4F6')
                .attr('rx', 6);

            mainGroup.selectAll('.category-label')
                .data(categories)
                .join('text')
                .attr('class', 'category-label')
                .attr('x', -margin.left + 10)
                .attr('y', d => categoryScale(d) + categoryScale.bandwidth() / 2 - 10)
                .attr('fill', this.isDarkMode() ? '#E5E7EB' : '#374151')
                .attr('dominant-baseline', 'middle')
                .style('font-size', '14px')
                .style('font-weight', '500')
                .each(function(d) {
                    const words = d.split('\n');
                    d3.select(this)
                        .selectAll('tspan')
                        .data(words)
                        .join('tspan')
                        .attr('x', -margin.left + 10)
                        .attr('dy', (_, i) => i === 0 ? 0 : '1.1em')
                        .text(d => d)
                        .style('font-size', '14px');
                });

            const projectGroups = mainGroup.selectAll('.project')
                .data(projects)
                .join('g')
                .attr('class', 'project')
                .attr('transform', d => `translate(${timeScale(new Date(d.startDate))},${categoryScale(d.category)})`);

            projectGroups.append('rect')
                .attr('class', 'project-rect')
                .attr('width', d => Math.max(
                    timeScale(new Date(d.endDate)) - timeScale(new Date(d.startDate)),
                    100
                ))
                .attr('height', categoryScale.bandwidth() * 0.8)
                .attr('y', categoryScale.bandwidth() * 0.1)
                .attr('rx', 6)
                .attr('fill', d => this.getProjectColor(d.category, d.completion))
                .attr('opacity', 0.9)
                .style('cursor', 'pointer')
                .on('mouseenter', (event, d) => {
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(200)
                        .attr('opacity', 1)
                        .style('filter', 'brightness(1.2)');
                    this.showTooltip(event, d);
                })
                .on('mousemove', (event, d) => {
                    this.updateTooltipPosition(event);
                })
                .on('mouseleave', (event) => {
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(200)
                        .attr('opacity', 0.9)
                        .style('filter', null);
                    this.hideTooltip();
                });

            projectGroups.append('text')
                .attr('x', 10)
                .attr('y', categoryScale.bandwidth() / 2)
                .attr('fill', 'white')
                .attr('dominant-baseline', 'middle')
                .style('font-size', '14px')
                .style('font-weight', '500')
                .style('pointer-events', 'none')
                .text(d => d.name);

            projectGroups.append('rect')
                .attr('class', 'completion-bar')
                .attr('x', 0)
                .attr('y', categoryScale.bandwidth() * 0.9 - 4)
                .attr('width', d => {
                    const width = timeScale(new Date(d.endDate)) - timeScale(new Date(d.startDate));
                    return Math.max(width * (d.completion / 100), 0);
                })
                .attr('height', 4)
                .attr('fill', 'white')
                .attr('opacity', 0.6);

            const timeAxis = d3.axisBottom(timeScale)
                .ticks(d3.timeMonth.every(1))
                .tickFormat(d3.timeFormat('%b %Y'));

            mainGroup.append('g')
                .attr('transform', `translate(0,${height + 10})`)
                .call(timeAxis)
                .selectAll('text')
                .attr('fill', this.isDarkMode() ? '#E5E7EB' : '#374151')
                .style('font-size', '12px')
                .attr('transform', 'rotate(-45)')
                .attr('dx', '-0.5em')
                .attr('dy', '0.5em')
                .style('text-anchor', 'end');
        },

        getProjectColor(category, completion) {
            const colors = {
                'Web\nDevelopment': '#3B82F6',
                'AI/ML': '#10B981',
                'Bioinformatics': '#8B5CF6',
                'Research': '#EF4444',
                'Data Analysis': '#F59E0B'
            };
            const baseColor = d3.rgb(colors[category.split('\n')[0]] || '#6B7280');
            return baseColor.darker(1 - completion / 100);
        },

        showTooltip(event, data) {
            const tooltip = this.$refs.tooltip;
            if (!tooltip) return;

            this.tooltipData = {
                name: data.name,
                description: data.description,
                completion: data.completion,
                dates: `${data.startDate} - ${data.endDate}`,
                category: data.category.replace('\n', ' ')
            };

            this.updateTooltipPosition(event);
            tooltip.classList.remove('hidden');
        },

        updateTooltipPosition(event) {
            const tooltip = this.$refs.tooltip;
            if (!tooltip) return;

            const container = this.$el.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            let left = event.clientX - container.left;
            let top = event.clientY - container.top + 20;

            if (left + tooltipRect.width > container.width) {
                left = container.width - tooltipRect.width - 10;
            }
            if (left < 0) {
                left = 10;
            }
            if (top + tooltipRect.height > container.height) {
                top = event.clientY - container.top - tooltipRect.height - 10;
            }

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        },

        hideTooltip() {
            const tooltip = this.$refs.tooltip;
            if (tooltip) {
                tooltip.classList.add('hidden');
            }
        },

        isDarkMode() {
            return document.documentElement.classList.contains('dark');
        },

        updateChartTheme() {
            this.initChart();
        }
    }));
});

// DNA Sequence Viewer Component
document.addEventListener('alpine:init', () => {
    Alpine.data('dnaViewer', () => ({
        sequence: 'ATGCTAGCTAGCTGATCGATCGTAGCTAGCTGATCGATCGTAGCTAGCTGATCG',
        viewportStart: 0,
        viewportSize: 30,
        baseColors: {
            'A': '#FF6B6B', // Red
            'T': '#4ECDC4', // Teal
            'G': '#45B7D1', // Blue
            'C': '#96CEB4'  // Green
        },
        complementMap: {
            'A': 'T',
            'T': 'A',
            'G': 'C',
            'C': 'G'
        },
        showComplement: false,
        zoom: 1,
        isDragging: false,
        lastX: 0,
        searchQuery: '',
        selectedBase: null,
        sequenceInfo: {
            length: 0,
            gc: 0,
            at: 0
        },
        isSearching: false,
        matches: [],
        currentMatchIndex: -1,
        resizeTimeout: null,

        init() {
            this.initViewer();
            this.calculateSequenceInfo();
            
            this.$watch('showComplement', () => {
                this.initViewer();
            });
            
            this.$watch('$store.darkMode', () => {
                this.updateTheme();
            });

            window.addEventListener('resize', this.handleResize.bind(this));

            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    this.navigate(-1);
                } else if (e.key === 'ArrowRight') {
                    this.navigate(1);
                }
            });
        },

        handleResize() {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = setTimeout(() => {
                this.initViewer();
            }, 250);
        },

        calculateSequenceInfo() {
            const gc = (this.sequence.match(/[GC]/g) || []).length;
            const at = (this.sequence.match(/[AT]/g) || []).length;
            
            this.sequenceInfo = {
                length: this.sequence.length,
                gc: ((gc / this.sequence.length) * 100).toFixed(1),
                at: ((at / this.sequence.length) * 100).toFixed(1)
            };
        },

        initViewer() {
            const container = d3.select('#dna-viewer');
            container.selectAll('*').remove();

            const margin = { top: 40, right: 20, bottom: 40, left: 20 };
            const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
            const height = container.node().getBoundingClientRect().height - margin.top - margin.bottom;

            const svg = container.append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            this.drawDNAStrands(svg, width, height);
            this.addControls(svg, width, height);
        },

        drawDNAStrands(svg, width, height) {
            const baseWidth = 30 * this.zoom;
            const baseHeight = 40;
            // Adjust yOffset based on complement visibility
            const yOffset = this.showComplement ? height / 3 : height / 2;
            
            // Add sequence navigation controls with adjusted position
            const navControlsY = this.showComplement ? height - 140 : height - 100;
            this.addNavigationControls(svg, width, navControlsY);

            // Add sequence info panel
            this.addSequenceInfo(svg, width);

            const visibleSequence = this.sequence.slice(this.viewportStart, this.viewportStart + this.viewportSize);

            // Draw main strand with enhanced interactivity
            const bases = svg.selectAll('.base')
                .data(visibleSequence.split('').map((base, index) => ({base, index})))
                .join('g')
                .attr('class', 'base')
                .attr('transform', (d, i) => `translate(${i * baseWidth}, ${yOffset})`);

            // Enhanced base rectangles with interactions
            bases.append('rect')
                .attr('width', baseWidth * 0.9)
                .attr('height', baseHeight)
                .attr('rx', 4)
                .attr('fill', d => this.baseColors[d.base])
                .attr('opacity', (d) => {
                    const globalIndex = d.index + this.viewportStart;
                    return this.isHighlighted(globalIndex) ? 1 : 0.8;
                })
                .attr('stroke', (d) => {
                    const globalIndex = d.index + this.viewportStart;
                    return this.isHighlighted(globalIndex) ? '#FCD34D' : 'none';
                })
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseenter', (event, d) => this.showBaseInfo(event, d))
                .on('mouseleave', () => this.hideBaseInfo())
                .on('click', (event, d) => this.toggleBaseSelection(d));

            // Base letters
            bases.append('text')
                .attr('x', baseWidth * 0.45)
                .attr('y', baseHeight / 2)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', 'white')
                .attr('font-weight', 'bold')
                .text(d => d.base);

            // Complement strand with animations
            if (this.showComplement) {
                const complements = svg.selectAll('.complement')
                    .data(visibleSequence.split('').map((base, index) => ({base, index})))
                    .join('g')
                    .attr('class', 'complement')
                    .attr('transform', (d, i) => `translate(${i * baseWidth}, ${yOffset + baseHeight + 20})`);

                complements.append('rect')
                    .attr('width', baseWidth * 0.9)
                    .attr('height', baseHeight)
                    .attr('rx', 4)
                    .attr('fill', d => this.baseColors[this.complementMap[d.base]])
                    .attr('opacity', 0)
                    .transition()
                    .duration(500)
                    .attr('opacity', 0.8);

                complements.append('text')
                    .attr('x', baseWidth * 0.45)
                    .attr('y', baseHeight / 2)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(d => this.complementMap[d.base])
                    .attr('opacity', 0)
                    .transition()
                    .duration(500)
                    .delay(250)
                    .attr('opacity', 1);

                // Animated connecting lines
                bases.append('line')
                    .attr('x1', baseWidth * 0.45)
                    .attr('y1', baseHeight)
                    .attr('x2', baseWidth * 0.45)
                    .attr('y2', baseHeight)
                    .attr('stroke', this.isDarkMode() ? '#4B5563' : '#9CA3AF')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '3,3')
                    .transition()
                    .duration(500)
                    .delay(500)
                    .attr('y2', baseHeight + 20);
            }
        },

        addNavigationControls(svg, width, navControlsY) {
            const navGroup = svg.append('g')
                .attr('class', 'navigation')
                .attr('transform', `translate(0, ${navControlsY})`);

            // Add navigation buttons with improved spacing
            const buttonSpacing = 60;
            ['⟪', '←', '→', '⟫'].forEach((symbol, i) => {
                const button = navGroup.append('g')
                    .attr('class', 'nav-button')
                    .attr('transform', `translate(${width/2 - (buttonSpacing * 1.5) + (i * buttonSpacing)}, 0)`)
                    .style('cursor', 'pointer')
                    .on('click', () => {
                        switch(i) {
                            case 0: this.navigate(-this.viewportSize); break;
                            case 1: this.navigate(-1); break;
                            case 2: this.navigate(1); break;
                            case 3: this.navigate(this.viewportSize); break;
                        }
                    });

                button.append('circle')
                    .attr('r', 15)
                    .attr('fill', this.isDarkMode() ? '#4B5563' : '#E5E7EB')
                    .attr('class', 'transition-colors duration-200')
                    .on('mouseenter', function() {
                        d3.select(this).attr('fill', d => this.isDarkMode() ? '#374151' : '#D1D5DB');
                    })
                    .on('mouseleave', function() {
                        d3.select(this).attr('fill', d => this.isDarkMode() ? '#4B5563' : '#E5E7EB');
                    });

                button.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', this.isDarkMode() ? '#E5E7EB' : '#4B5563')
                    .attr('font-size', '14px')
                    .text(symbol);
            });
        },

        addSequenceInfo(svg, width) {
            const infoGroup = svg.append('g')
                .attr('class', 'sequence-info')
                .attr('transform', 'translate(10, 10)');

            const info = [
                `Length: ${this.sequenceInfo.length}bp`,
                `GC Content: ${this.sequenceInfo.gc}%`,
                `AT Content: ${this.sequenceInfo.at}%`,
                `Position: ${this.viewportStart + 1}-${Math.min(this.viewportStart + this.viewportSize, this.sequence.length)}`
            ];

            info.forEach((text, i) => {
                infoGroup.append('text')
                    .attr('x', 0)
                    .attr('y', i * 20)
                    .attr('fill', this.isDarkMode() ? '#E5E7EB' : '#4B5563')
                    .attr('font-size', '12px')
                    .text(text);
            });
        },

        showBaseInfo(event, d) {
            // Remove any existing tooltips
            this.hideBaseInfo();

            const tooltip = d3.select('#dna-viewer')
                .append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute')
                .style('background-color', this.isDarkMode() ? '#1F2937' : 'white')
                .style('padding', '12px')
                .style('border-radius', '8px')
                .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)')
                .style('font-size', '12px')
                .style('pointer-events', 'none')
                .style('z-index', 1000)
                .style('border', `1px solid ${this.isDarkMode() ? '#374151' : '#E5E7EB'}`);

            const globalIndex = d.index + this.viewportStart;
            
            // Calculate local statistics (±5 bases)
            const start = Math.max(0, globalIndex - 5);
            const end = Math.min(this.sequence.length, globalIndex + 6);
            const localSeq = this.sequence.slice(start, end);
            const localStats = this.calculateLocalStats(localSeq);

            const tooltipContent = `
                <div class="space-y-2">
                    <div class="font-semibold text-sm ${this.isDarkMode() ? 'text-white' : 'text-gray-900'}">
                        Base: ${d.base}
                    </div>
                    <div class="text-xs ${this.isDarkMode() ? 'text-gray-300' : 'text-gray-600'}">
                        Position: ${globalIndex + 1}<br>
                        Complement: ${this.complementMap[d.base]}<br>
                        Local Context (±5 bases):<br>
                        GC Content: ${localStats.gc}%<br>
                        Stability Score: ${localStats.stability}<br>
                        ${localStats.motif !== 'No common motif' ? `Motif: ${localStats.motif}<br>` : ''}
                        Sequence: ${localSeq}
                    </div>
                </div>
            `;

            tooltip.html(tooltipContent);

            const tooltipNode = tooltip.node();
            const tooltipRect = tooltipNode.getBoundingClientRect();
            const containerRect = event.target.closest('#dna-viewer').getBoundingClientRect();

            let left = event.pageX - containerRect.left - tooltipRect.width / 2;
            let top = event.pageY - containerRect.top - tooltipRect.height - 10;

            // Keep tooltip within container bounds
            left = Math.max(10, Math.min(left, containerRect.width - tooltipRect.width - 10));
            top = Math.max(10, Math.min(top, containerRect.height - tooltipRect.height - 10));

            tooltip
                .style('left', `${left}px`)
                .style('top', `${top}px`)
                .style('opacity', 0)
                .transition()
                .duration(200)
                .style('opacity', 1);
        },

        hideBaseInfo() {
            d3.select('#dna-viewer')
                .selectAll('.tooltip')
                .transition()
                .duration(200)
                .style('opacity', 0)
                .remove();
        },

        calculateLocalStats(sequence) {
            const gc = (sequence.match(/[GC]/g) || []).length;
            const stability = this.calculateStabilityScore(sequence);
            const motif = this.findCommonMotif(sequence);
            
            return {
                gc: ((gc / sequence.length) * 100).toFixed(1),
                stability,
                motif
            };
        },

        calculateStabilityScore(sequence) {
            const stackingEnergies = {
                'GC': 3, 'CG': 3,
                'AT': 2, 'TA': 2,
                'GT': 1, 'TG': 1,
                'GA': 1, 'AG': 1,
                'CT': 1, 'TC': 1,
                'CA': 1, 'AC': 1
            };
            
            let score = 0;
            for (let i = 0; i < sequence.length - 1; i++) {
                const pair = sequence.slice(i, i + 2);
                score += stackingEnergies[pair] || 0;
            }
            return (score / (sequence.length - 1)).toFixed(2);
        },

        findCommonMotif(sequence) {
            const motifs = {
                'TATA': 'TATA Box',
                'CAAT': 'CAAT Box',
                'GCCG': 'CpG Island',
                'AATAAA': 'PolyA Signal',
                'GAGA': 'GAGA Factor',
                'CCAAT': 'CCAAT Box',
                'CACGTG': 'E-box',
                'TGACGT': 'CRE'
            };
            
            for (const [pattern, name] of Object.entries(motifs)) {
                if (sequence.includes(pattern)) return name;
            }
            return 'No common motif';
        },

        addControls(svg, width, height) {
            // Adjust control position based on complement visibility
            const controlsY = this.showComplement ? height - 100 : height - 60;
            
            const controlsGroup = svg.append('g')
                .attr('class', 'controls')
                .attr('transform', `translate(0, ${controlsY})`);

            // Add zoom controls with improved styling and interaction
            const zoomControls = [
                { symbol: '+', action: () => this.adjustZoom(0.2), x: width - 60 },
                { symbol: '−', action: () => this.adjustZoom(-0.2), x: width - 20 }
            ];

            zoomControls.forEach(control => {
                const button = controlsGroup.append('g')
                    .attr('class', `zoom-${control.symbol === '+' ? 'in' : 'out'}`)
                    .style('cursor', 'pointer')
                    .on('click', control.action);

                // Button background with hover effect
                button.append('circle')
                    .attr('cx', control.x)
                    .attr('cy', 20)
                    .attr('r', 15)
                    .attr('fill', this.isDarkMode() ? '#4B5563' : '#E5E7EB')
                    .attr('class', 'transition-colors duration-200')
                    .on('mouseenter', function() {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr('fill', d => this.isDarkMode() ? '#374151' : '#D1D5DB');
                    })
                    .on('mouseleave', function() {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr('fill', d => this.isDarkMode() ? '#4B5563' : '#E5E7EB');
                    });

                // Button symbol
                button.append('text')
                    .attr('x', control.x)
                    .attr('y', 20)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', this.isDarkMode() ? '#E5E7EB' : '#4B5563')
                    .attr('font-size', '18px')
                    .attr('font-weight', 'bold')
                    .text(control.symbol);
            });
        },

        adjustZoom(delta) {
            const newZoom = Math.max(0.5, Math.min(2, this.zoom + delta));
            if (newZoom !== this.zoom) {
                this.zoom = newZoom;
                this.initViewer();
            }
        },

        navigate(delta) {
            const newStart = Math.max(0, Math.min(
                this.viewportStart + delta,
                this.sequence.length - this.viewportSize
            ));
            if (newStart !== this.viewportStart) {
                this.viewportStart = newStart;
                this.initViewer();
            }
        },

        isHighlighted(index) {
            return this.matches.includes(index) || index === this.selectedBase;
        },

        search() {
            if (!this.searchQuery) {
                this.matches = [];
                this.currentMatchIndex = -1;
                this.initViewer();
                return;
            }

            this.matches = [];
            let index = -1;
            const searchTerm = this.searchQuery.toUpperCase();
            
            while ((index = this.sequence.indexOf(searchTerm, index + 1)) !== -1) {
                this.matches.push(index);
            }
            
            if (this.matches.length > 0) {
                this.currentMatchIndex = 0;
                this.viewportStart = Math.max(0, this.matches[0] - Math.floor(this.viewportSize / 4));
                this.initViewer();
            }
        },

        nextMatch() {
            if (this.matches.length === 0) return;
            
            this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
            this.viewportStart = Math.max(0, this.matches[this.currentMatchIndex] - Math.floor(this.viewportSize / 4));
            this.initViewer();
        },

        toggleBaseSelection(d) {
            const index = this.viewportStart + d.index;
            this.selectedBase = this.selectedBase === index ? null : index;
            this.initViewer();
        },

        isDarkMode() {
            return document.documentElement.classList.contains('dark');
        },

        updateTheme() {
            this.initViewer();
        },

        destroyed() {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            window.removeEventListener('resize', this.handleResize.bind(this));
            document.removeEventListener('keydown', this.handleKeydown);
        }
    }));
});