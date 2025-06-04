import 'reflect-metadata';

// Ensure Reflect is available globally
if (typeof window !== 'undefined' && !window.Reflect) {
    console.error('Reflect-metadata not loaded properly!');
}

import {Actor, RequireComponent} from "@vertex-link/acs";
import {TransformComponent} from "@vertex-link/engine";

console.log('🚀 Vertex Link Documentation - Simplified Version');
console.log(Actor);

class TestActor extends Actor {
    @RequireComponent<TransformComponent>()
    transform: TransformComponent;
    
    constructor() {
        super('test-actor');
        console.log('transform', this.transform);
    }
}

const testActor = new TestActor();
console.log(testActor);

class DocumentationApp {
    private initialized = false;

    constructor() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    private init() {
        if (this.initialized) return;
        this.initialized = true;

        console.log('📚 Documentation app initialized');

        this.setupWebGPUCheck();
        this.setupExampleLinks();
        this.addVersionInfo();
        this.setupCardHovers();
        this.setupScrollAnimations();
        this.addStatusPanel();

        // Test imports after everything else is set up
        this.testEngineImports();
    }

    private setupWebGPUCheck() {
        const statusDot = document.querySelector('.status-dot') as HTMLElement;
        const statusText = document.querySelector('.server-status span') as HTMLElement;

        if (navigator.gpu) {
            console.log('✅ WebGPU is available');
            if (statusText) statusText.textContent = 'WebGPU Ready - Development Server Running';
        } else {
            console.warn('❌ WebGPU is not available');
            if (statusDot) {
                statusDot.style.background = '#ff6b6b';
                statusDot.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.6)';
            }
            if (statusText) statusText.textContent = 'WebGPU Not Available - Limited Functionality';
        }
    }

    private setupExampleLinks() {
        document.querySelectorAll('.example-link').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target as HTMLAnchorElement;
                const example = target.textContent?.trim() || 'Unknown';

                console.log(`🎯 Example clicked: ${example}`);

                target.style.opacity = '0.7';
                const originalText = target.innerHTML;
                target.innerHTML = '🚀 Loading...';

                setTimeout(() => {
                    target.style.opacity = '1';
                    target.innerHTML = originalText;
                    alert(`${example} - Coming Soon!\n\nCheck console for import test results.`);
                }, 1000);
            });
        });
    }

    private setupCardHovers() {
        document.querySelectorAll('.example-card').forEach((card, index) => {
            (card as HTMLElement).style.animationDelay = `${index * 0.1}s`;
        });
    }

    private setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.example-card').forEach((card) => {
            observer.observe(card);
        });
    }

    private addVersionInfo() {
        const versionInfo = document.createElement('div');
        versionInfo.style.cssText = `
            margin-top: 20px; padding: 10px; background: rgba(255, 255, 255, 0.05);
            border-radius: 8px; display: inline-block;
        `;

        versionInfo.innerHTML = `
            <small style="color: #666; font-size: 0.8rem;">
                Dev Build • ${new Date().toLocaleString()} • Import Testing
            </small>
        `;

        const header = document.querySelector('header');
        if (header) {
            header.appendChild(versionInfo);
        }
    }

    private addStatusPanel() {
        const statusContainer = document.createElement('div');
        statusContainer.style.cssText = `
            position: fixed; top: 20px; left: 20px;
            background: rgba(0, 0, 0, 0.8); color: white;
            padding: 15px 20px; border-radius: 8px; font-size: 0.8rem;
            z-index: 1000; border: 1px solid rgba(255, 255, 255, 0.2);
            min-width: 220px; max-width: 300px;
        `;

        statusContainer.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">📦 Import Test Status</div>
            <div id="acs-status">🔄 ACS: Testing...</div>
            <div id="engine-status">🔄 Engine: Testing...</div>
            <div style="margin-top: 10px; font-size: 0.7rem; color: #aaa;">
                Check console for detailed results
            </div>
        `;

        document.body.appendChild(statusContainer);
    }

    private async testEngineImports() {
        console.log('🧪 Testing engine package imports...');

        // Test ACS package
        try {
            console.log('🔍 Testing @vertex-link/acs import...');
            const acsModule = await import('@vertex-link/acs');
            console.log('✅ @vertex-link/acs imported successfully!');
            console.log('📦 ACS exports:', Object.keys(acsModule));
            this.updateStatus('acs-status', '✅ ACS: Ready', '#4ecdc4');
        } catch (error) {
            console.log('❌ @vertex-link/acs import failed:', error);
            this.updateStatus('acs-status', '❌ ACS: Failed', '#ff6b6b');

            // Try alternative import methods
            this.tryAlternativeImports('acs');
        }

        // Test Engine package
        try {
            console.log('🔍 Testing @vertex-link/engine import...');
            const engineModule = await import('@vertex-link/engine');
            console.log('✅ @vertex-link/engine imported successfully!');
            console.log('📦 Engine exports:', Object.keys(engineModule));
            this.updateStatus('engine-status', '✅ Engine: Ready', '#4ecdc4');
        } catch (error) {
            console.log('❌ @vertex-link/engine import failed:', error);
            this.updateStatus('engine-status', '❌ Engine: Failed', '#ff6b6b');

            // Try alternative import methods
            this.tryAlternativeImports('engine');
        }
    }

    private async tryAlternativeImports(packageName: 'acs' | 'engine') {
        console.log(`🔄 Trying alternative imports for ${packageName}...`);

        const paths = [
            `../../${packageName}/dist/index.js`,
            `../../${packageName}/dist/index.ts`,
            `../../../${packageName}/dist/index.js`,
            `/@fs/packages/${packageName}/dist/index.js`
        ];

        for (const path of paths) {
            try {
                console.log(`🔍 Trying: ${path}`);
                const module = await import(path);
                console.log(`✅ Alternative import worked: ${path}`);
                console.log('📦 Exports:', Object.keys(module));
                this.updateStatus(`${packageName}-status`, `✅ ${packageName.toUpperCase()}: Alt path`, '#45b7d1');
                return;
            } catch (error) {
                console.log(`❌ Failed: ${path}`, error.message);
            }
        }

        console.log(`😞 All alternative imports failed for ${packageName}`);
    }

    private updateStatus(elementId: string, text: string, color: string) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = text;
            element.style.color = color;
        }
    }
}

// Initialize the documentation app
new DocumentationApp();

// Development mode indicator
if (window.location.hostname === 'localhost') {
    const devIndicator = document.createElement('div');
    devIndicator.style.cssText = `
        position: fixed; bottom: 10px; right: 10px;
        background: rgba(78, 205, 196, 0.9); color: white;
        padding: 8px 12px; border-radius: 6px; font-size: 0.8rem;
        z-index: 1000; cursor: pointer;
    `;
    devIndicator.textContent = '🔧 DEV - Testing Imports';
    devIndicator.onclick = () => {
        console.log('🛠️ Running manual import test...');
        // Manual test that you can trigger
        import('@vertex-link/acs').then(m => {
            console.log('✅ Manual ACS test passed:', Object.keys(m));
        }).catch(e => {
            console.log('❌ Manual ACS test failed:', e);
        });
    };
    document.body.appendChild(devIndicator);
}

export { DocumentationApp };