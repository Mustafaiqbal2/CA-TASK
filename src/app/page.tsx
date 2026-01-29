'use client';

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./page.module.css";

// Icon components (inline SVGs for performance)
const Icons = {
    chat: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    ),
    form: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9h6" />
            <path d="M9 13h6" />
            <path d="M9 17h4" />
        </svg>
    ),
    search: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
        </svg>
    ),
    source: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10,9 9,9 8,9" />
        </svg>
    ),
    arrow: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
        </svg>
    ),
    sparkle: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
    ),
    check: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20,6 9,17 4,12" />
        </svg>
    ),
};

// Step icons for How It Works
const stepIcons = {
    interviewing: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="10" r="1" fill="currentColor" />
            <circle cx="8" cy="10" r="1" fill="currentColor" />
            <circle cx="16" cy="10" r="1" fill="currentColor" />
        </svg>
    ),
    preview: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9h6" />
            <path d="M9 13h6" />
            <path d="M9 17h4" />
        </svg>
    ),
    active: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    researching: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
        </svg>
    ),
    presenting: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <path d="M9 15l2 2 4-4" />
        </svg>
    ),
};

export default function HomePage() {
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        // Intersection Observer for scroll animations
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(styles.visible);
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
        );

        const elements = document.querySelectorAll(`.${styles.fadeUp}`);
        elements.forEach((el) => observerRef.current?.observe(el));

        return () => observerRef.current?.disconnect();
    }, []);

    const features = [
        {
            icon: Icons.chat,
            title: "AI-Powered Interviews",
            description: "Our intelligent agent asks the right questions to understand exactly what you need to research.",
        },
        {
            icon: Icons.form,
            title: "Dynamic Forms",
            description: "Automatically generates custom forms with conditional logic based on your research requirements.",
        },
        {
            icon: Icons.search,
            title: "Deep Research",
            description: "Conducts comprehensive research using multiple sources, filtered by your location and context.",
        },
        {
            icon: Icons.source,
            title: "Source Attribution",
            description: "Every finding is backed by verifiable sources with direct links for further exploration.",
        },
    ];

    const steps = [
        { key: "interviewing", icon: stepIcons.interviewing, title: "Interview", desc: "AI asks targeted questions" },
        { key: "preview", icon: stepIcons.preview, title: "Preview", desc: "Review your custom form" },
        { key: "active", icon: stepIcons.active, title: "Fill Out", desc: "Provide research details" },
        { key: "researching", icon: stepIcons.researching, title: "Research", desc: "AI conducts deep research" },
        { key: "presenting", icon: stepIcons.presenting, title: "Results", desc: "Get cited findings" },
    ];

    return (
        <div className={styles.page}>
            {/* Animated Background */}
            <div className={styles.backgroundEffects}>
                <div className={styles.gradientOrb1} />
                <div className={styles.gradientOrb2} />
                <div className={styles.gradientOrb3} />
                <div className={styles.gridOverlay} />
            </div>

            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>{Icons.sparkle}</span>
                        <span className={styles.logoText}>Research<span className={styles.logoAi}>AI</span></span>
                    </div>
                    <div className={styles.navLinks}>
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How It Works</a>
                        <Link href="/app" className={styles.navCta}>
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.heroBadge}>
                        <span className={styles.badgeDot} />
                        AI-Powered Research Tool
                    </div>
                    <h1 className={styles.heroTitle}>
                        <span className={styles.gradientText}>Turn Questions</span>
                        <br />
                        <span>Into Research</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Stop wasting hours on manual research. Our AI interviews you, builds
                        dynamic forms, and delivers comprehensive findings with cited sources —
                        all tailored to your location and context.
                    </p>
                    <div className={styles.heroCtas}>
                        <Link href="/app" className={styles.primaryCta}>
                            Start Researching
                            {Icons.arrow}
                        </Link>
                        <a href="#how-it-works" className={styles.secondaryCta}>
                            See How It Works
                        </a>
                    </div>
                    <div className={styles.heroStats}>
                        <div className={styles.stat}>
                            <span className={styles.statNumber}>10x</span>
                            <span className={styles.statLabel}>Faster Research</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNumber}>100%</span>
                            <span className={styles.statLabel}>Cited Sources</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNumber}>∞</span>
                            <span className={styles.statLabel}>Topics</span>
                        </div>
                    </div>
                </div>

                {/* Hero Visual */}
                <div className={styles.heroVisual}>
                    <div className={styles.mockupWindow}>
                        <div className={styles.mockupHeader}>
                            <div className={styles.mockupDots}>
                                <span /><span /><span />
                            </div>
                            <div className={styles.mockupTitle}>Research AI</div>
                        </div>
                        <div className={styles.mockupContent}>
                            <div className={styles.chatBubble}>
                                <span className={styles.chatAvatar}>AI</span>
                                <p>What topic would you like to research today?</p>
                            </div>
                            <div className={`${styles.chatBubble} ${styles.userBubble}`}>
                                <p>Best payment processors for startups in Germany</p>
                            </div>
                            <div className={styles.chatBubble}>
                                <span className={styles.chatAvatar}>AI</span>
                                <p>Great! I see you&apos;re in Germany. I&apos;ll factor in EU regulations, SEPA support, and local providers...</p>
                            </div>
                            <div className={styles.typingIndicator}>
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className={styles.features}>
                <div className={styles.sectionHeader}>
                    <h2 className={`${styles.sectionTitle} ${styles.fadeUp}`}>
                        <span className={styles.gradientText}>Powerful Features</span>
                    </h2>
                    <p className={`${styles.sectionSubtitle} ${styles.fadeUp}`}>
                        Everything you need to conduct comprehensive research in minutes, not hours
                    </p>
                </div>
                <div className={styles.featuresGrid}>
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className={`${styles.featureCard} ${styles.fadeUp}`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className={styles.featureIcon}>{feature.icon}</div>
                            <h3 className={styles.featureTitle}>{feature.title}</h3>
                            <p className={styles.featureDesc}>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className={styles.howItWorks}>
                <div className={styles.sectionHeader}>
                    <h2 className={`${styles.sectionTitle} ${styles.fadeUp}`}>
                        <span className={styles.gradientText}>How It Works</span>
                    </h2>
                    <p className={`${styles.sectionSubtitle} ${styles.fadeUp}`}>
                        From question to comprehensive research in five simple steps
                    </p>
                </div>
                <div className={styles.stepsContainer}>
                    <div className={styles.stepsLine} />
                    {steps.map((step, index) => (
                        <div
                            key={step.key}
                            className={`${styles.step} ${styles.fadeUp}`}
                            style={{ animationDelay: `${index * 0.15}s` }}
                        >
                            <div className={styles.stepNumber}>{index + 1}</div>
                            <div className={styles.stepIcon}>{step.icon}</div>
                            <h3 className={styles.stepTitle}>{step.title}</h3>
                            <p className={styles.stepDesc}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Benefits Section */}
            <section className={styles.benefits}>
                <div className={`${styles.benefitsContent} ${styles.fadeUp}`}>
                    <h2 className={styles.benefitsTitle}>
                        Why researchers love <span className={styles.gradientText}>Research AI</span>
                    </h2>
                    <div className={styles.benefitsList}>
                        <div className={styles.benefit}>
                            <span className={styles.benefitCheck}>{Icons.check}</span>
                            <span>Location-aware research tailored to your region</span>
                        </div>
                        <div className={styles.benefit}>
                            <span className={styles.benefitCheck}>{Icons.check}</span>
                            <span>Dynamic forms that adapt based on your answers</span>
                        </div>
                        <div className={styles.benefit}>
                            <span className={styles.benefitCheck}>{Icons.check}</span>
                            <span>Every claim backed by verifiable sources</span>
                        </div>
                        <div className={styles.benefit}>
                            <span className={styles.benefitCheck}>{Icons.check}</span>
                            <span>Real-time research progress tracking</span>
                        </div>
                        <div className={styles.benefit}>
                            <span className={styles.benefitCheck}>{Icons.check}</span>
                            <span>Export findings in multiple formats</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.ctaSection}>
                <div className={`${styles.ctaContent} ${styles.fadeUp}`}>
                    <h2 className={styles.ctaTitle}>
                        Ready to research <span className={styles.gradientText}>smarter</span>?
                    </h2>
                    <p className={styles.ctaSubtitle}>
                        Join thousands of researchers who save hours every week with AI-powered research
                    </p>
                    <Link href="/app" className={styles.ctaButton}>
                        Start Your First Research
                        {Icons.arrow}
                    </Link>
                </div>
                <div className={styles.ctaGlow} />
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerBrand}>
                        <div className={styles.logo}>
                            <span className={styles.logoIcon}>{Icons.sparkle}</span>
                            <span className={styles.logoText}>Research<span className={styles.logoAi}>AI</span></span>
                        </div>
                        <p className={styles.footerTagline}>
                            AI-powered research that saves you hours
                        </p>
                    </div>
                    <div className={styles.footerLinks}>
                        <div className={styles.footerColumn}>
                            <h4>Product</h4>
                            <a href="#features">Features</a>
                            <a href="#how-it-works">How It Works</a>
                            <Link href="/app">Get Started</Link>
                        </div>
                        <div className={styles.footerColumn}>
                            <h4>Resources</h4>
                            <a href="#">Documentation</a>
                            <a href="#">API Reference</a>
                            <a href="#">Support</a>
                        </div>
                        <div className={styles.footerColumn}>
                            <h4>Company</h4>
                            <a href="#">About</a>
                            <a href="#">Privacy</a>
                            <a href="#">Terms</a>
                        </div>
                    </div>
                </div>
                <div className={styles.footerBottom}>
                    <p>© 2024 Research AI. Built with Mastra &amp; GPT.</p>
                </div>
            </footer>
        </div>
    );
}
