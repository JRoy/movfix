function fixQuicktimeVideos(): { fixed: number; details: string } {
    let fixedCount = 0;

    // Fix <source> children with quicktime type or .mov URL
    const sources = document.querySelectorAll('video source');
    sources.forEach(src => {
        const type = src.getAttribute('type')?.toLowerCase() || '';
        const srcUrl = src.getAttribute('src')?.toLowerCase() || '';
        if (type === 'video/quicktime' || srcUrl.endsWith('.mov')) {
            const parent = src.parentNode;
            if (!parent) return;
            // Get all current attributes
            const attrs = [...src.attributes].map(a => [a.name, a.value] as const);
            // Create temp element to force DOM refresh
            const temp = document.createElement('source1');
            attrs.forEach(([n, v]) => temp.setAttribute(n, v));
            temp.setAttribute('type', 'video/mp4');
            parent.replaceChild(temp, src);
            // Create real source element
            const newSource = document.createElement('source');
            [...temp.attributes].forEach(a => newSource.setAttribute(a.name, a.value));
            parent.replaceChild(newSource, temp);
            // Reload the video
            const video = (parent as Element).closest('video') as HTMLVideoElement | null;
            if (video) video.load();
            fixedCount++;
        }
    });

    // Fix <video src="..."> with .mov URL (no child source)
    const videoSrcs = document.querySelectorAll('video[src]') as NodeListOf<HTMLVideoElement>;
    videoSrcs.forEach(video => {
        if (video.querySelectorAll('source').length === 0) {
            const srcUrl = video.getAttribute('src')?.toLowerCase() || '';
            if (srcUrl.endsWith('.mov')) {
                // For direct src, just change type hint and reload
                video.setAttribute('type', 'video/mp4');
                video.load();
                fixedCount++;
            }
        }
    });

    return {fixed: fixedCount, details: `Fixed ${fixedCount} video(s)`};
}

function detectVideos(): { status: 'quicktime' | 'other' | 'none'; count: number; details: string } {
    const sources = document.querySelectorAll('video source');
    const videoSrcs = document.querySelectorAll('video[src]');

    let quicktimeCount = 0;
    let otherVideoCount = 0;

    // Check <source> children
    sources.forEach(src => {
        const type = src.getAttribute('type')?.toLowerCase() || '';
        const srcUrl = src.getAttribute('src')?.toLowerCase() || '';
        if (type === 'video/quicktime' || srcUrl.endsWith('.mov')) {
            quicktimeCount++;
        } else {
            otherVideoCount++;
        }
    });

    // Check <video src="..."> (no child source)
    videoSrcs.forEach(video => {
        if (video.querySelectorAll('source').length === 0) {
            const srcUrl = video.getAttribute('src')?.toLowerCase() || '';
            if (srcUrl.endsWith('.mov')) {
                quicktimeCount++;
            } else {
                otherVideoCount++;
            }
        }
    });

    if (quicktimeCount > 0) return {
        status: 'quicktime',
        count: quicktimeCount,
        details: `${quicktimeCount} QuickTime video(s) detected`
    };
    if (otherVideoCount > 0) return {
        status: 'other',
        count: otherVideoCount,
        details: `${otherVideoCount} video(s) found (not QuickTime)`
    };
    return {status: 'none', count: 0, details: 'No videos found on this page'};
}

document.addEventListener('DOMContentLoaded', async () => {
    const statusDiv = document.getElementById('status') as HTMLDivElement;
    const fixBtn = document.getElementById('fixBtn') as HTMLButtonElement;
    const resultDiv = document.getElementById('result') as HTMLDivElement;

    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

        if (!tab?.id) {
            statusDiv.textContent = 'Error: Could not access tab';
            statusDiv.className = 'none';
            return;
        }

        try {
            const results = await chrome.scripting.executeScript({
                target: {tabId: tab.id}, func: detectVideos,
            });

            if (!results || results.length === 0) {
                statusDiv.textContent = 'Error: Could not run detection';
                statusDiv.className = 'none';
                return;
            }

            const result = results[0].result as {
                status: 'quicktime' | 'other' | 'none';
                count: number;
                details: string
            };

            statusDiv.textContent = result.details;
            statusDiv.className = result.status;

            if (result.status !== 'none') {
                fixBtn.classList.remove('hidden');
                fixBtn.classList.add('visible');
            } else {
                fixBtn.classList.add('hidden');
                fixBtn.classList.remove('visible');
            }
        } catch (executeError) {
            statusDiv.textContent = 'Cannot run on this page';
            statusDiv.className = 'none';
            fixBtn.classList.add('hidden');
            fixBtn.classList.remove('visible');
        }
    } catch (error) {
        statusDiv.textContent = 'Error: Could not access tab';
        statusDiv.className = 'none';
    }

    fixBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab?.id) {
                resultDiv.textContent = 'Error: Could not access tab';
                resultDiv.className = 'error';
                return;
            }

            const results = await chrome.scripting.executeScript({
                target: {tabId: tab.id}, func: fixQuicktimeVideos,
            });

            if (!results || results.length === 0) {
                resultDiv.textContent = 'Error: Could not run fix';
                resultDiv.className = 'error';
                return;
            }

            const fixResult = results[0].result as { fixed: number; details: string };

            resultDiv.textContent = `Fixed ${fixResult.fixed} video(s)!`;
            resultDiv.className = 'success';
            fixBtn.textContent = 'Fixed ✓';
            fixBtn.disabled = true;

            const detectionResults = await chrome.scripting.executeScript({
                target: {tabId: tab.id}, func: detectVideos,
            });

            if (detectionResults && detectionResults.length > 0) {
                const detectionResult = detectionResults[0].result as {
                    status: 'quicktime' | 'other' | 'none';
                    count: number;
                    details: string
                };
                statusDiv.textContent = detectionResult.details;
                statusDiv.className = detectionResult.status;
            }
        } catch (error) {
            resultDiv.textContent = 'Error: Could not fix videos';
            resultDiv.className = 'error';
        }
    });
});
