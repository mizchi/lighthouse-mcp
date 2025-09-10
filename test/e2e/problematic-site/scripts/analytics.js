// 同期的に読み込まれる分析スクリプト（レンダーブロッキング）
(function() {
    'use strict';
    
    // 重い初期化処理をシミュレート
    function initializeAnalytics() {
        const start = Date.now();
        // 100msのブロッキング
        while (Date.now() - start < 100) {
            // CPU intensive work
        }
        
        console.log('Analytics initialized');
    }
    
    // グローバル変数の汚染
    window.analytics = {
        track: function(event, data) {
            console.log('Tracking:', event, data);
        },
        page: function() {
            console.log('Page view tracked');
        }
    };
    
    // 即座に実行
    initializeAnalytics();
    
    // DOMに依存する処理（本来はDOMContentLoadedを待つべき）
    document.write('<div id="analytics-pixel" style="display:none"></div>');
})();