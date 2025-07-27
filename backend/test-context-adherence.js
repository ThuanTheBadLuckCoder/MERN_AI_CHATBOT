// Test script for enhanced context adherence
const { executeWithCodeHandling } = require('./src/controllers/components/agents/custom-agent.ts');

async function testContextAdherence() {
    console.log('🧪 Testing Enhanced Context Adherence...\n');

    // Test Case 1: New session with existing code context
    console.log('📋 Test Case 1: New session with existing code context');
    const testCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Hero Section</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <style>
        .hero-image {
            background-image: url('https://images.pexels.com/photos/3228766/pexels-photo-3228766.jpeg');
            background-size: cover;
            background-position: center;
        }
        .hero-overlay {
            background-color: rgba(139, 92, 246, 0.8);
        }
    </style>
</head>
<body class="bg-white">
    <div class="hero-image">
        <div class="hero-overlay">
            <div class="relative px-4 py-16 mx-auto overflow-hidden">
                <div class="flex flex-col items-center justify-between xl:flex-row">
                    <div class="w-full max-w-xl mb-12 xl:mb-0 xl:pr-16 xl:w-7/12">
                        <h2 class="max-w-lg mb-6 font-sans text-3xl font-bold tracking-tight sm:text-4xl">
                            The quick, brown fox jumps over a lazy dog
                        </h2>
                        <p class="max-w-xl mb-4 text-base md:text-lg text-white">
                            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    try {
        // Simulate storing code in memory
        const codeMemoryTool = require('./src/controllers/components/agents/custom-agent.ts').codeMemoryTool;
        await codeMemoryTool.func(JSON.stringify({
            action: "store",
            type: "full-document",
            content: testCode,
            conversationId: "test-session-1"
        }));

        // Test new session request
        const result1 = await executeWithCodeHandling(
            "Can you change the main color from purple to blue?",
            [], // Empty chat history = new session
            "test-session-1"
        );

        console.log('✅ New session result:', result1.output.substring(0, 200) + '...');
        console.log('📊 References found:', result1.references.length);
        console.log('');

    } catch (error) {
        console.error('❌ Test Case 1 failed:', error.message);
    }

    // Test Case 2: Existing session with chat history (TailwindCSS only)
    console.log('📋 Test Case 2: Existing session with chat history (TailwindCSS only)');
    const existingHistory = [
        { role: "user", content: "I need help creating a hero section" },
        { role: "assistant", content: "I can help you create a hero section" }
    ];

    try {
        const result2 = await executeWithCodeHandling(
            "Can you add a contact form to the hero section using only TailwindCSS?",
            existingHistory,
            "test-session-2"
        );

        console.log('✅ Existing session result:', result2.output.substring(0, 200) + '...');
        console.log('📊 References found:', result2.references.length);
        console.log('');

    } catch (error) {
        console.error('❌ Test Case 2 failed:', error.message);
    }

    // Test Case 2b: Existing session with forbidden framework attempt
    console.log('📋 Test Case 2b: Existing session with forbidden framework attempt');
    try {
        const result2b = await executeWithCodeHandling(
            "Can you add Bootstrap components to the hero section?",
            existingHistory,
            "test-session-2b"
        );

        console.log('✅ Forbidden framework result:', result2b.output.substring(0, 200) + '...');
        console.log('📊 References found:', result2b.references.length);
        console.log('');

    } catch (error) {
        console.error('❌ Test Case 2b failed:', error.message);
    }

    // Test Case 3: No context available
    console.log('📋 Test Case 3: No context available');
    try {
        const result3 = await executeWithCodeHandling(
            "Create a simple contact form",
            [],
            "test-session-3"
        );

        console.log('✅ No context result:', result3.output.substring(0, 200) + '...');
        console.log('📊 References found:', result3.references.length);
        console.log('');

    } catch (error) {
        console.error('❌ Test Case 3 failed:', error.message);
    }

    console.log('🎉 Context adherence testing completed!');
}

// Run the test
testContextAdherence().catch(console.error); 