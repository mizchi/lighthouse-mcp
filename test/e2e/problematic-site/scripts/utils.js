// ユーティリティスクリプト（同期読み込み）
// eslint-disable-next-line no-unused-vars
var Utils = (function() {
    'use strict';
    
    // 大きなデータ構造
    var largeData = [];
    for (var i = 0; i < 10000; i++) {
        largeData.push({
            id: i,
            name: 'Item ' + i,
            value: Math.random() * 1000,
            timestamp: new Date().toISOString()
        });
    }
    
    // 同期的なAPIリクエストをシミュレート（実際には避けるべき）
    function fetchDataSync() {
        // XMLHttpRequestの同期モード（非推奨）
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/data', false); // false = 同期
        try {
            xhr.send();
        } catch (e) {
            console.log('Sync request failed:', e);
        }
    }
    
    // グローバル汚染
    window.APP_CONFIG = {
        version: '1.0.0',
        debug: true,
        data: largeData
    };
    
    return {
        getData: function() {
            return largeData;
        },
        fetchSync: fetchDataSync
    };
})();