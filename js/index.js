import * as THREE from './node_modules/three/build/three.module.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';

let global = {loadStatus: 0}

let scene, camera, renderer, clock, obj, mixer, mixer2, stats, open_door, close_door, znads, breznads, raycaster, wall, wallanim, wallblock;

let narvik, narvik2, lucca, lucca2, modelw, modelw2, bremen, bremen2, toulon, toulon2, verona, verona2, klucnot, kluczun, digkuk, kukalozun;

let narvikpod, narvikpod2, luccapod, luccapod2, modelwpod, modelwpod2, bremenpod, bremenpod2, toulonpod, toulonpod2, veronapod, veronapod2, klucnotpod, kluczunpod, digkukpod, digkukzunpod, podboj, kukalopod, kukalozunpod;

let kovinc = [ 'belapod', 'melpod', 'hrapod', 'bukpod', 'cespod', 'mahpod', 'venpod' ];
let kovincBarva = 0;

let kovincTest = false;

let selectedDoor = '';
let prevSelected = '';
let selectedKluka = 'narvik';
let selectedDigitalno = false;

let hasNads = false;
let loadingFinished = 0;
let loadText = document.getElementById('loadText');
let load = document.getElementById('load');
let loadlogo = document.getElementById('loadlogo');

let mahnadsv, belnadsv, melnadsv, hranadsv, buknadsv, vennadsv, cesnadsv;

let deleting = false;
let doorOpen = false;
let turned = false;
let ringing = false;

let _listener, _CloseListener;

let audio = new Audio( './mov/bell.mp3' );

open_door = document.querySelector('.open_door');
close_door = document.querySelector('.close_door');

znads = document.querySelector('.znads');
breznads = document.querySelector('.breznads');

// MacOS test

let IS_MacOS;

function MacOSTest() {
    if ( window.navigator.platform == 'MacIntel' || window.navigator.platform == 'MacPPC' || window.navigator.platform == 'Mac68K' ) {
        IS_MacOS = true;
    } else {
        IS_MacOS = false;
    }
}

window.db_clear = function() {
    indexedDB.deleteDatabase('gltf_db').onsuccess=(function(e){console.log("Delete OK");})
}

window.onload = MacOSTest();

function pre_init() {
    // PRELOAD AND INDEXED DATABASE STORE

    async function db_init() {
        if (!('indexedDB' in window)) {
            db_handle_error('unsupported');
            return;
        }
        
        db_request_open('count');
        
    } db_init();

    async function db_request_open(mode) {

        if (mode == 'store') {
            let file = await db_fetch_file();
            global.file = file;
            console.log(file);

            let request = window.indexedDB.open("gltf_db", 1);
            request.onsuccess = db_onsuccess_store;
            request.onerror = db_onerror;
            request.onupgradeneeded = db_onupgradeneeded;
            return;
        }

        if (mode == 'count') {
            let request = window.indexedDB.open("gltf_db", 1);
            request.onsuccess = db_onsuccess_count;
            request.onerror = db_onerror;
            request.onupgradeneeded = db_onupgradeneeded;
            return;
        }

        if (mode == "retrieve") {
            let request = window.indexedDB.open("gltf_db", 1);
            request.onsuccess = db_onsuccess_retrieve;
            request.onerror = db_onerror;
            request.onupgradeneeded = db_onupgradeneeded;
            return;
        }

        console.log('Indexeddb opening mode unspecified.');

    }

    function db_onerror(event) {
        db_handle_error('rejected');
    }

    async function db_onsuccess_count(event) {
        let db = event.target.result;
        let tx = db.transaction("gltf_file", "readwrite");
        let store = tx.objectStore("gltf_file");
        let count = await count_request_promise(store.count());

        console.log("Objects in store: " + count);

        if (count == 0) {
            db_request_open('store');
        } else {
            db_request_open('retrieve');
        }

        function count_request_promise(request) {
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            })
        }

        console.log('Successful count.');

        tx.onerror = event => {
            console.log("Error in indexeddb transaction: " + event);
        }

        tx.oncomplete = function() {
            console.log('Transaction completed.');
            db.close();
        };
    }

    async function db_onsuccess_store(event) {
        let db = event.target.result;
        let tx = db.transaction("gltf_file", "readwrite");
        let store = tx.objectStore("gltf_file");
        console.log(global.file);
        store.put(global.file);

        db_request_open('retrieve');

        tx.oncomplete = function() {
            console.log('Transaction completed.');
            console.log('Successful storage.');
            db.close();
        };
    }

    async function db_onsuccess_retrieve(event) {
        console.log("Retrieving ...");
        let db = event.target.result;
        let tx = db.transaction("gltf_file");
        let store = tx.objectStore("gltf_file");
        store.getAll().onsuccess = e => {
            global.file = e.target.result[0];
            console.log("Got file: " + global.file);

            let URL = window.URL || window.webkitURL;

            global.fileURL = URL.createObjectURL(global.file);

            console.log(global.fileURL);
            init();
            animate();
        };
    }

    async function db_fetch_file() {
        let promise = new Promise((resolve, reject) => {
            let url = './gltf/kovinc-final.glb';
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.responseType = "blob";
            xhr.onprogress = function(e) {
                global.fileStatus = Math.round((e.loaded / e.total) * 100);
                load_screen_update_file();
            };
            xhr.onerror = function() {reject("Network error.")};
            xhr.onload = function() {
                if (xhr.status === 200) {resolve(xhr.response)}
                else {reject("Loading error:" + xhr.statusText)}
            };
            xhr.send();
        })
        return promise;
    }

    function db_onupgradeneeded(event) {
        let db = event.target.result;
        console.log('Upgrade needed.');

        try {
            let store = db.createObjectStore('gltf_file', {
                autoIncrement: true
            });
        } catch (ex) {
            console.log("Exception in db_onupgradeneeded() - " + ex.message);
            return;
        }
    }

    function db_handle_error(mode) {
        switch (mode) {
            case 'unsupported':
                console.log("Browser doesn't support a stable version of IndexedDB.");
                break;

            case 'rejected':
                console.log("User rejected database request.");
                break;
        
            default:
                console.log("Something went wrong. Unspecified.");
                break;
        }
    }
} pre_init();

function init() {

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x626262);

    camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize( window.innerWidth, window.innerHeight );
    if (! IS_MacOS ) renderer.setPixelRatio( window.devicePixelRatio );
    if ( IS_MacOS ) renderer.setPixelRatio( window.devicePixelRatio / 1.5 );
    renderer.gammaFactor = 2.2;

    document.body.appendChild( renderer.domElement );

    const pmremGenerator = new THREE.PMREMGenerator( renderer );

    // ADD MODELS

    const loader = new GLTFLoader();

    function loadModel(variant) {

        loader.load(
            global.fileURL,

            function ( gltf ) {

                obj = gltf.scene;

                gltf.scene.name = variant;

                let i = 0;

                // ANIMATIONS
                mixer = new THREE.AnimationMixer( obj );

                mixer.stopAllAction(); //!
                
                gltf.scene.position.set( 0,-1,0 );
                gltf.scene.rotation.y = Math.PI / 2;
                scene.add( gltf.scene );

                function openDoor() {

                    gltf.animations.forEach((clip) => {
                        var action = mixer.clipAction(clip);
                        action.timeScale = 1;
                        action.paused = false;
                        action.setLoop( THREE.LoopOnce );
                        action.clampWhenFinished = true;
                        action.play();
                    });
                        
                    renderer.render( scene, camera );

                    open_door.style.display = 'none';
                    close_door.style.display = 'flex';

                    doorOpen = true;

                }

                function closeDoor() {

                    gltf.animations.forEach(( clip ) => {
                        var action = mixer.clipAction( clip );
                        action.paused = false;
                        action.timeScale = -1;
                        action.setLoop( THREE.LoopOnce );
                        action.play();
                    });
                        
                    renderer.render( scene, camera );

                    open_door.style.display = 'flex';
                    close_door.style.display = 'none';

                    doorOpen = false;

                }

                _listener = function() {
                    if (! doorOpen ) openDoor();
                }

                _CloseListener = function() {
                    if ( doorOpen ) closeDoor();
                }

                open_door.addEventListener('click', _listener);
                close_door.addEventListener('click', _CloseListener);

                let _ToggleNadsListener = () => {

                    if (! kovincTest ) {
                        breznads.style.display = 'none';
                        znads.style.display = 'flex';
                        
                        wallblock.scale.set( 0, 0, 0 );

                        for ( let a = 11; a < 14; a++ ) {

                            let part = scene.getObjectByName( selectedDoor + a );
                            part.scale.set( 0, 0, 0 );

                        }

                        let nads = scene.getObjectByName( selectedDoor + 'nads' );
                        nads.scale.set( 1, 1, 1 );

                        hasNads = true;
                    }

                }

                let _CloseNadsListener = () => {

                    if (! kovincTest ) {
                        znads.style.display = 'none';
                        breznads.style.display = 'flex';

                        wallblock.scale.set( 1, 1, 1 );

                        for ( let a = 11; a < 14; a++ ) {

                            let part = scene.getObjectByName( selectedDoor + a );
                            part.scale.set( 1, 1, 1 );

                        }

                        let nads = scene.getObjectByName( selectedDoor + 'nads' );
                        nads.scale.set( 0, 0, 0 );

                        hasNads = false;
                    }

                }

                $('.breznads').on( 'click tap', _ToggleNadsListener );
                $('.znads').on( 'click tap', _CloseNadsListener );

                narvik = scene.getObjectByName( 'narvik' );
                narvik2 = scene.getObjectByName( 'narvik2' );

                lucca = scene.getObjectByName( 'lucca' );
                lucca2 = scene.getObjectByName( 'lucca2' );

                modelw = scene.getObjectByName( 'modelw' );
                modelw2 = scene.getObjectByName( 'modelw2' );

                bremen = scene.getObjectByName( 'bremen' );
                bremen2 = scene.getObjectByName( 'bremen2' );

                toulon = scene.getObjectByName( 'toulon' );
                toulon2 = scene.getObjectByName( 'toulon2' );

                verona = scene.getObjectByName( 'verona' );
                verona2 = scene.getObjectByName( 'verona2' );

                klucnot = scene.getObjectByName( 'klucnot' );
                kluczun = scene.getObjectByName( 'kluczun' );

                narvik.scale.set( 1, 1, 1 );
                narvik2.scale.set( 1, 1, 1 );

                digkuk = scene.getObjectByName( 'digkuk' );
                digkuk.scale.set( 0, 0, 0 );

                kukalozun = scene.getObjectByName( 'digkukzun' );
                kukalozun.scale.set( 0, 0, 0 );

                for ( let i = 0; i < 14; i++ ) {

                    let melody = scene.getObjectByName( 'melody' + i );
                    melody.scale.set(0, 0, 0);

                    let hrast = scene.getObjectByName( 'hrast' + i );
                    hrast.scale.set(0, 0, 0);

                    let bukva = scene.getObjectByName( 'bukva' + i );
                    bukva.scale.set(0, 0, 0);

                    let cesna = scene.getObjectByName( 'cesna' + i );
                    cesna.scale.set(0, 0, 0);

                    let mahagoni = scene.getObjectByName( 'mahagoni' + i );
                    mahagoni.scale.set(0, 0, 0);

                    let venge = scene.getObjectByName( 'venge' + i );
                    venge.scale.set(0, 0, 0);
        
                }

                for ( let i = 0; i < kovinc.length; i++ ) {

                    let vrsta = kovinc[ i ];

                    for ( let a = 0; a < 14; a++ ) {

                        let del = scene.getObjectByName( vrsta + a );
                        del.scale.set(0, 0, 0);
            
                    }

                }

                narvikpod = scene.getObjectByName( 'narvikpod' );
                narvikpod2 = scene.getObjectByName( 'narvikpod2' );

                luccapod = scene.getObjectByName( 'luccapod' );
                luccapod2 = scene.getObjectByName( 'luccapod2' );

                modelwpod = scene.getObjectByName( 'modelwpod' );
                modelwpod2 = scene.getObjectByName( 'modelwpod2' );

                bremenpod = scene.getObjectByName( 'bremenpod' );
                bremenpod2 = scene.getObjectByName( 'bremenpod2' );

                toulonpod = scene.getObjectByName( 'toulonpod' );
                toulonpod2 = scene.getObjectByName( 'toulonpod2' );

                veronapod = scene.getObjectByName( 'veronapod' );
                veronapod2 = scene.getObjectByName( 'veronapod2' );

                klucnotpod = scene.getObjectByName( 'klucnotpod' );
                kluczunpod = scene.getObjectByName( 'kluczunpod' );

                digkukpod = scene.getObjectByName( 'digkukpod' );
                digkukzunpod = scene.getObjectByName( 'digkukzunpod' );

                kukalopod = scene.getObjectByName( 'kukalonotpod' );
                kukalozunpod = scene.getObjectByName( 'kukalozunpod' );

                podboj = scene.getObjectByName( 'podboj' );
                podboj.scale.set( 0, 0, 0 );

                digkukpod.scale.set( 0, 0, 0 );
                digkukzunpod.scale.set( 0, 0, 0 );

                kukalopod.scale.set( 0, 0, 0 );
                kukalozunpod.scale.set( 0, 0, 0 );

                klucnotpod.scale.set( 0, 0, 0 );
                kluczunpod.scale.set( 0, 0, 0 );

                // NADSVETLOBE

                belnadsv = scene.getObjectByName( 'belanads' );
                belnadsv.scale.set( 0, 0, 0 );

                mahnadsv = scene.getObjectByName( 'mahagoninads' );
                mahnadsv.scale.set( 0, 0, 0 );

                melnadsv = scene.getObjectByName( 'melodynads' );
                melnadsv.scale.set( 0, 0, 0 );

                hranadsv = scene.getObjectByName( 'hrastnads' );
                hranadsv.scale.set( 0, 0, 0 );

                buknadsv = scene.getObjectByName( 'bukvanads' );
                buknadsv.scale.set( 0, 0, 0 );

                vennadsv = scene.getObjectByName( 'vengenads' );
                vennadsv.scale.set( 0, 0, 0 );

                cesnadsv = scene.getObjectByName( 'cesnanads' );
                cesnadsv.scale.set( 0, 0, 0 );

                let Kovinc = function() {

                    kovincTest = true;
                    hasNads = false;

                    breznads.style.display = 'flex';
                    znads.style.display = 'none';

                    wallblock.scale.set( 1, 1, 1 );
                    
                    let kukalozun2 = scene.getObjectByName( 'kukalozun' );
                    kukalozun2.scale.set( 0, 0, 0 );
            
                    let kukalonot = scene.getObjectByName( 'kukalonot' );
                    kukalonot.scale.set( 0, 0, 0 );
            
                    toulon.scale.set( .01, .01, .01 );
                    toulon2.scale.set( .01, .01, .01 );
            
                    klucnot.scale.set( .01, .01, .01 );
                    klucnot.scale.set( .01, .01, .01 );
            
                    kluczun.scale.set( .01, .01, .01 );
                    kluczun.scale.set( .01, .01, .01 );
            
                    lucca.scale.set( .01, .01, .01 );
                    lucca2.scale.set( .01, .01, .01 );
            
                    narvik.scale.set( .01, .01, .01 );
                    narvik2.scale.set( .01, .01, .01 );
            
                    modelw.scale.set( .01, .01, .01 );
                    modelw2.scale.set( .01, .01, .01 );
            
                    bremen.scale.set( .01, .01, .01 );
                    bremen2.scale.set( .01, .01, .01 );
            
                    verona.scale.set( .01, .01, .01 );
                    verona2.scale.set( .01, .01, .01 );
            
                    digkuk.scale.set( 0, 0, 0 );
                    kukalozun.scale.set( 0, 0, 0 );
            
                    for ( let i = 0; i < 14; i++ ) {
            
                        let bela = scene.getObjectByName( 'bela' + i );
                        bela.scale.set(0, 0, 0);
            
                        let melody = scene.getObjectByName( 'melody' + i );
                        melody.scale.set(0, 0, 0);
            
                        let hrast = scene.getObjectByName( 'hrast' + i );
                        hrast.scale.set(0, 0, 0);
            
                        let bukva = scene.getObjectByName( 'bukva' + i );
                        bukva.scale.set(0, 0, 0);
            
                        let cesna = scene.getObjectByName( 'cesna' + i );
                        cesna.scale.set(0, 0, 0);
            
                        let mahagoni = scene.getObjectByName( 'mahagoni' + i );
                        mahagoni.scale.set(0, 0, 0);
            
                        let venge = scene.getObjectByName( 'venge' + i );
                        venge.scale.set(0, 0, 0);
            
                    }
            
                    belnadsv.scale.set( 0, 0, 0 );
            
                    mahnadsv.scale.set( 0, 0, 0 );
                
                    melnadsv.scale.set( 0, 0, 0 );
            
                    hranadsv.scale.set( 0, 0, 0 );
            
                    buknadsv.scale.set( 0, 0, 0 );
            
                    vennadsv.scale.set( 0, 0, 0 );
            
                    cesnadsv.scale.set( 0, 0, 0 );
            
                    for ( let i = 0; i < kovinc.length; i++ ) {
            
                        let vrsta = kovinc[ i ];
            
                        for ( let a = 0; a < 14; a++ ) {
            
                            let del = scene.getObjectByName( vrsta + a );
                            del.scale.set(0, 0, 0);
                
                        }
            
                    }
            
                    podboj.scale.set( 1, 1, 1 );
            
                    kukalopod.scale.set( 1, 1, 1 );
                    kukalozunpod.scale.set( 1, 1, 1 );
            
                    klucnotpod.scale.set( 1, 1, 1 );
                    kluczunpod.scale.set( 1, 1, 1 );
            
                    for ( let i = 0; i < kovinc.length; i++ ) {
            
                        for ( let a = 0; a < 14; a++ ) {
            
                            let del = scene.getObjectByName( kovinc[ kovincBarva ] + a );
                            del.scale.set( 1, 1, 1 );
                
                        }
            
                    }

                    digkuk.scale.set( 0, 0, 0 );
                    kukalozun.scale.set( 0, 0, 0 );

                    if ( selectedDigitalno ) {
            
                        digkukpod.scale.set( 1, 1, 1 );
                        digkukzunpod.scale.set( 1, 1, 1 );
                    
                    } else {

                        digkukpod.scale.set( 0, 0, 0 );
                        digkukzunpod.scale.set( 0, 0, 0 );
            
                    }

                    let kluka = scene.getObjectByName( selectedKluka + 'pod' );
                    kluka.scale.set( 1, 1, 1 );
                    
                    let kluka2 = scene.getObjectByName( selectedKluka + 'pod2' );
                    kluka2.scale.set( 1, 1, 1 );

                    if ( selectedKluka == 'toulon' ) {

                        klucnotpod.scale.set( .01, .01, .01 );
                        klucnotpod.scale.set( .01, .01, .01 );

                        kluczunpod.scale.set( .01, .01, .01 );
                        kluczunpod.scale.set( .01, .01, .01 );

                    }

                    $('.brezpodboja').css({
                        
                        'z-index' : '2'

                    });

                }

                // DELETE PODBOJ

                let DeleteKovinc = function() {

                    kovincTest = false;

                    for ( let i = 0; i < kovinc.length; i++ ) {
            
                        let vrsta = kovinc[ i ];
            
                        for ( let a = 0; a < 14; a++ ) {
            
                            let del = scene.getObjectByName( vrsta + a );
                            del.scale.set(0, 0, 0);
                
                        }
            
                    }
            
                    podboj.scale.set( 0, 0, 0 );
            
                    kukalopod.scale.set( 0, 0, 0 );
                    kukalozunpod.scale.set( 0, 0, 0 );
            
                    klucnotpod.scale.set( 0, 0, 0 );
                    kluczunpod.scale.set( 0, 0, 0 );

                    luccapod.scale.set( .01, .01, .01 );
                    luccapod2.scale.set( .01, .01, .01 );

                    narvikpod.scale.set( .01, .01, .01 );
                    narvikpod2.scale.set( .01, .01, .01 );

                    modelwpod.scale.set( .01, .01, .01 );
                    modelwpod2.scale.set( .01, .01, .01 );

                    bremenpod.scale.set( .01, .01, .01 );
                    bremenpod2.scale.set( .01, .01, .01 );

                    toulonpod.scale.set( .01, .01, .01 );
                    toulonpod2.scale.set( .01, .01, .01 );

                    veronapod.scale.set( .01, .01, .01 );
                    veronapod2.scale.set( .01, .01, .01 );

                    let kluka = scene.getObjectByName( selectedKluka );
                    let kluka2 = scene.getObjectByName( selectedKluka + '2' );

                    kluka.scale.set( 1, 1, 1 );
                    kluka2.scale.set( 1, 1, 1 );

                    if (selectedKluka == 'toulon') {
                        klucnot.scale.set( 0, 0, 0 );
                        kluczun.scale.set( 0, 0, 0 );
                    } else {
                        klucnot.scale.set( 1, 1, 1 );
                        kluczun.scale.set( 1, 1, 1 );
                    }

                    let kukalozun2 = scene.getObjectByName( 'kukalozun' );
                    kukalozun2.scale.set( 1, 1, 1 );
            
                    let kukalonot = scene.getObjectByName( 'kukalonot' );
                    kukalonot.scale.set( 1, 1, 1 );

                    for ( let a = 0; a < 14; a++ ) {

                        let part = scene.getObjectByName( selectedDoor + a );
                        part.scale.set( 1, 1, 1 );
        
                    }
                    
                    digkukpod.scale.set( 0, 0, 0 );
                    digkukzunpod.scale.set( 0, 0, 0 );

                    if ( selectedDigitalno ) {

                        digkuk.scale.set( 1, 1, 1 );
                        kukalozun.scale.set( 1, 1, 1 );
                    
                    } else {

                        digkuk.scale.set( 0, 0, 0 );
                        kukalozun.scale.set( 0, 0, 0 );
            
                    }

                    $('.brezpodboja').css({
                        
                        'z-index' : '-1'

                    });

                }
            
                // KOVINSKI PODBOJ
            
                $('.podboj').on('click tap', Kovinc);

                $('.brezpodboja').on('click tap', DeleteKovinc);

            },
            function (xhr) {

                console.log((xhr.loaded / xhr.total * 100) + '% loaded');

                if (!isNaN(xhr.loaded / xhr.total)) {
                    global.loadStatus += xhr.loaded / xhr.total;

                    load_screen_update();

                    if ( xhr.loaded / xhr.total * 100 == 100 ) {

                        console.log("%c Door Model Loading Finished", "color: aqua");
                        load_screen_finish();

                    }
                }
        
            },
            function (error) {

                console.log('An error happened');

                const geometry = new THREE.BoxGeometry( 1, 1, 1 );
                const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
                const cube = new THREE.Mesh( geometry, material );
                scene.add( cube );
        
            }
        );

    }

    loadModel('kovinc');

    selectedDoor = 'bela';
    prevSelected = 'bela';

    // MODEL SELECTOR

    $('.bela').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        prevSelected = selectedDoor;
        selectedDoor = 'bela';
        kovincBarva = 0;

        console.log('prev ' + prevSelected + ' ' + 'current ' + selectedDoor );

        deleting = true;

        if (! kovincTest ) {
            for ( let i = 0; i < 14; i++ ) {

            let object = scene.getObjectByName( 'bela' + i );
            object.scale.set(1, 1, 1);

            let melody = scene.getObjectByName( 'melody' + i );
            melody.scale.set(0, 0, 0);

            let hrast = scene.getObjectByName( 'hrast' + i );
            hrast.scale.set(0, 0, 0);

            let bukva = scene.getObjectByName( 'bukva' + i );
            bukva.scale.set(0, 0, 0);

            let cesna = scene.getObjectByName( 'cesna' + i );
            cesna.scale.set(0, 0, 0);

            let mahagoni = scene.getObjectByName( 'mahagoni' + i );
            mahagoni.scale.set(0, 0, 0);

            let venge = scene.getObjectByName( 'venge' + i );
            venge.scale.set(0, 0, 0);

            }
        }

        if ( hasNads && !kovincTest ) {

            breznads.style.display = 'none';
            znads.style.display = 'flex';
            
            wallblock.scale.set( 0, 0, 0 );

            for ( let a = 11; a < 14; a++ ) {

                let part = scene.getObjectByName( selectedDoor + a );
                part.scale.set( 0, 0, 0 );

            }

            let nads = scene.getObjectByName( prevSelected + 'nads' );
            nads.scale.set( 0, 0, 0 );

            let newnads = scene.getObjectByName( selectedDoor + 'nads' );
            newnads.scale.set( 1, 1, 1 );

        }

        if ( kovincTest ) {

            $('.podboj').click();

        }

        setTimeout(function() {
            deleting = false;
        }, 700);

    });

    $('.cesna').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        prevSelected = selectedDoor;
        selectedDoor = 'cesna';
        kovincBarva = 4;

        console.log('prev ' + prevSelected + ' ' + 'current ' + selectedDoor );

        deleting = true;

        if (! kovincTest ) {
            for ( let i = 0; i < 14; i++ ) {

            let cesna = scene.getObjectByName( 'cesna' + i );
            cesna.scale.set(1, 1, 1);

            let bela = scene.getObjectByName( 'bela' + i );
            bela.scale.set(0, 0, 0);

            let hrast = scene.getObjectByName( 'hrast' + i );
            hrast.scale.set(0, 0, 0);

            let melody = scene.getObjectByName( 'melody' + i );
            melody.scale.set(0, 0, 0);

            let bukva = scene.getObjectByName( 'bukva' + i );
            bukva.scale.set(0, 0, 0);

            let mahagoni = scene.getObjectByName( 'mahagoni' + i );
            mahagoni.scale.set(0, 0, 0);

            let venge = scene.getObjectByName( 'venge' + i );
            venge.scale.set(0, 0, 0);

            }
        }

        if ( hasNads && !kovincTest ) {

            breznads.style.display = 'none';
            znads.style.display = 'flex';
            
            wallblock.scale.set( 0, 0, 0 );

            for ( let a = 11; a < 14; a++ ) {

                let part = scene.getObjectByName( selectedDoor + a );
                part.scale.set( 0, 0, 0 );

            }

            let nads = scene.getObjectByName( prevSelected + 'nads' );
            nads.scale.set( 0, 0, 0 );

            let newnads = scene.getObjectByName( selectedDoor + 'nads' );
            newnads.scale.set( 1, 1, 1 );

        }

        if ( kovincTest ) {

            $('.podboj').click();

        }

        setTimeout(function() {
            deleting = false;
        }, 700);

    });

    $('.hrast').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        prevSelected = selectedDoor;
        selectedDoor = 'hrast';
        kovincBarva = 2;

        deleting = true;

        if (! kovincTest ) {
            for ( let i = 0; i < 14; i++ ) {

            let hrast = scene.getObjectByName( 'hrast' + i );
            hrast.scale.set(1, 1, 1);

            let object = scene.getObjectByName( 'bela' + i );
            object.scale.set(0, 0, 0);

            let melody = scene.getObjectByName( 'melody' + i );
            melody.scale.set(0, 0, 0);

            let bukva = scene.getObjectByName( 'bukva' + i );
            bukva.scale.set(0, 0, 0);

            let cesna = scene.getObjectByName( 'cesna' + i );
            cesna.scale.set(0, 0, 0);

            let mahagoni = scene.getObjectByName( 'mahagoni' + i );
            mahagoni.scale.set(0, 0, 0);

            let venge = scene.getObjectByName( 'venge' + i );
            venge.scale.set(0, 0, 0);

            }
        }

        if ( hasNads && !kovincTest) {

            breznads.style.display = 'none';
            znads.style.display = 'flex';
            
            wallblock.scale.set( 0, 0, 0 );

            for ( let a = 11; a < 14; a++ ) {

                let part = scene.getObjectByName( selectedDoor + a );
                part.scale.set( 0, 0, 0 );

            }

            let nads = scene.getObjectByName( prevSelected + 'nads' );
            nads.scale.set( 0, 0, 0 );

            let newnads = scene.getObjectByName( selectedDoor + 'nads' );
            newnads.scale.set( 1, 1, 1 );

        }

        if ( kovincTest ) {

            $('.podboj').click();

        }

        setTimeout(function() {
            deleting = false;
        }, 700);

    });

    $('.hrast-melody').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        prevSelected = selectedDoor;
        selectedDoor = 'melody';
        kovincBarva = 1;

        console.log('prev ' + prevSelected + ' ' + 'current ' + selectedDoor );

        deleting = true;

        if (! kovincTest ) {
            for ( let i = 0; i < 14; i++ ) {

            let melody = scene.getObjectByName( 'melody' + i );
            melody.scale.set(1, 1, 1);

            let bela = scene.getObjectByName( 'bela' + i );
            bela.scale.set(0, 0, 0);

            let hrast = scene.getObjectByName( 'hrast' + i );
            hrast.scale.set(0, 0, 0);

            let bukva = scene.getObjectByName( 'bukva' + i );
            bukva.scale.set(0, 0, 0);

            let cesna = scene.getObjectByName( 'cesna' + i );
            cesna.scale.set(0, 0, 0);

            let mahagoni = scene.getObjectByName( 'mahagoni' + i );
            mahagoni.scale.set(0, 0, 0);

            let venge = scene.getObjectByName( 'venge' + i );
            venge.scale.set(0, 0, 0);

            }
        }

        if ( hasNads && !kovincTest ) {

            breznads.style.display = 'none';
            znads.style.display = 'flex';
            
            wallblock.scale.set( 0, 0, 0 );

            for ( let a = 11; a < 14; a++ ) {

                let part = scene.getObjectByName( selectedDoor + a );
                part.scale.set( 0, 0, 0 );

            }

            let nads = scene.getObjectByName( prevSelected + 'nads' );
            nads.scale.set( 0, 0, 0 );

            let newnads = scene.getObjectByName( selectedDoor + 'nads' );
            newnads.scale.set( 1, 1, 1 );

        }

        if ( kovincTest ) {

            $('.podboj').click();

        }

        setTimeout(function() {
            deleting = false;
        }, 700);

    });

    $('.mahagoni').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        prevSelected = selectedDoor;
        selectedDoor = 'mahagoni';
        kovincBarva = 5;

        console.log('prev ' + prevSelected + ' ' + 'current ' + selectedDoor );

        deleting = true;

        if (! kovincTest ) {
            for ( let i = 0; i < 14; i++ ) {

            let mahagoni = scene.getObjectByName( 'mahagoni' + i );
            mahagoni.scale.set(1, 1, 1);

            let bela = scene.getObjectByName( 'bela' + i );
            bela.scale.set(0, 0, 0);

            let hrast = scene.getObjectByName( 'hrast' + i );
            hrast.scale.set(0, 0, 0);

            let bukva = scene.getObjectByName( 'bukva' + i );
            bukva.scale.set(0, 0, 0);

            let cesna = scene.getObjectByName( 'cesna' + i );
            cesna.scale.set(0, 0, 0);

            let melody = scene.getObjectByName( 'melody' + i );
            melody.scale.set(0, 0, 0);

            let venge = scene.getObjectByName( 'venge' + i );
            venge.scale.set(0, 0, 0);

            }
        }

        if ( hasNads && !kovincTest ) {

            breznads.style.display = 'none';
            znads.style.display = 'flex';
            
            wallblock.scale.set( 0, 0, 0 );

            for ( let a = 11; a < 14; a++ ) {

                let part = scene.getObjectByName( selectedDoor + a );
                part.scale.set( 0, 0, 0 );

            }

            let nads = scene.getObjectByName( prevSelected + 'nads' );
            nads.scale.set( 0, 0, 0 );

            let newnads = scene.getObjectByName( selectedDoor + 'nads' );
            newnads.scale.set( 1, 1, 1 );

        }

        if ( kovincTest ) {

            $('.podboj').click();

        }

        setTimeout(function() {
            deleting = false;
        }, 700);

    });

    $('.venge').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        prevSelected = selectedDoor;
        selectedDoor = 'venge';
        kovincBarva = 6;

        console.log('prev ' + prevSelected + ' ' + 'current ' + selectedDoor );

        deleting = true;

        if (! kovincTest ) {
            for ( let i = 0; i < 14; i++ ) {

            let venge = scene.getObjectByName( 'venge' + i );
            venge.scale.set(1, 1, 1);

            let bukva = scene.getObjectByName( 'bukva' + i );
            bukva.scale.set(0, 0, 0);

            let bela = scene.getObjectByName( 'bela' + i );
            bela.scale.set(0, 0, 0);

            let hrast = scene.getObjectByName( 'hrast' + i );
            hrast.scale.set(0, 0, 0);

            let melody = scene.getObjectByName( 'melody' + i );
            melody.scale.set(0, 0, 0);

            let cesna = scene.getObjectByName( 'cesna' + i );
            cesna.scale.set(0, 0, 0);

            let mahagoni = scene.getObjectByName( 'mahagoni' + i );
            mahagoni.scale.set(0, 0, 0);

            }
        }

        if ( hasNads && !kovincTest ) {

            breznads.style.display = 'none';
            znads.style.display = 'flex';
            
            wallblock.scale.set( 0, 0, 0 );

            for ( let a = 11; a < 14; a++ ) {

                let part = scene.getObjectByName( selectedDoor + a );
                part.scale.set( 0, 0, 0 );

            }

            let nads = scene.getObjectByName( prevSelected + 'nads' );
            nads.scale.set( 0, 0, 0 );

            let newnads = scene.getObjectByName( selectedDoor + 'nads' );
            newnads.scale.set( 1, 1, 1 );

        }

        if ( kovincTest ) {

            $('.podboj').click();

        }

        setTimeout(function() {
            deleting = false;
        }, 700);

    });

    $('.bukva').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        prevSelected = selectedDoor;
        selectedDoor = 'bukva';
        kovincBarva = 3;

        console.log('prev ' + prevSelected + ' ' + 'current ' + selectedDoor );

        deleting = true;

        if (! kovincTest ) {
            for ( let i = 0; i < 14; i++ ) {

            let bukva = scene.getObjectByName( 'bukva' + i );
            bukva.scale.set(1, 1, 1);

            let bela = scene.getObjectByName( 'bela' + i );
            bela.scale.set(0, 0, 0);

            let hrast = scene.getObjectByName( 'hrast' + i );
            hrast.scale.set(0, 0, 0);

            let melody = scene.getObjectByName( 'melody' + i );
            melody.scale.set(0, 0, 0);

            let cesna = scene.getObjectByName( 'cesna' + i );
            cesna.scale.set(0, 0, 0);

            let mahagoni = scene.getObjectByName( 'mahagoni' + i );
            mahagoni.scale.set(0, 0, 0);

            let venge = scene.getObjectByName( 'venge' + i );
            venge.scale.set(0, 0, 0);

            }
        }

        if ( hasNads && !kovincTest ) {

            breznads.style.display = 'none';
            znads.style.display = 'flex';
            
            wallblock.scale.set( 0, 0, 0 );

            for ( let a = 11; a < 14; a++ ) {

                let part = scene.getObjectByName( selectedDoor + a );
                part.scale.set( 0, 0, 0 );

            }

            let nads = scene.getObjectByName( prevSelected + 'nads' );
            nads.scale.set( 0, 0, 0 );

            let newnads = scene.getObjectByName( selectedDoor + 'nads' );
            newnads.scale.set( 1, 1, 1 );

        }

        if ( kovincTest ) {

            $('.podboj').click();

        }

        setTimeout(function() {
            deleting = false;
        }, 700);

    });

    // KLUKE SELECTOR

    $('.narvik').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        selectedKluka = 'narvik';

        if ( kovincTest ) {

            narvikpod.scale.set( 1, 1, 1 );
            narvikpod2.scale.set( 1, 1, 1 );

            klucnotpod.scale.set( 1, 1, 1 );
            klucnotpod.scale.set( 1, 1, 1 );

            kluczunpod.scale.set( 1, 1, 1 );
            kluczunpod.scale.set( 1, 1, 1 );

            luccapod.scale.set( .01, .01, .01 );
            luccapod2.scale.set( .01, .01, .01 );

            modelwpod.scale.set( .01, .01, .01 );
            modelwpod2.scale.set( .01, .01, .01 );

            bremenpod.scale.set( .01, .01, .01 );
            bremenpod2.scale.set( .01, .01, .01 );

            toulonpod.scale.set( .01, .01, .01 );
            toulonpod2.scale.set( .01, .01, .01 );

            veronapod.scale.set( .01, .01, .01 );
            veronapod2.scale.set( .01, .01, .01 );

        } else {

            narvik.scale.set( 1, 1, 1 );
            narvik2.scale.set( 1, 1, 1 );

            klucnot.scale.set( 1, 1, 1 );
            klucnot.scale.set( 1, 1, 1 );

            kluczun.scale.set( 1, 1, 1 );
            kluczun.scale.set( 1, 1, 1 );

            lucca.scale.set( .01, .01, .01 );
            lucca2.scale.set( .01, .01, .01 );

            modelw.scale.set( .01, .01, .01 );
            modelw2.scale.set( .01, .01, .01 );

            bremen.scale.set( .01, .01, .01 );
            bremen2.scale.set( .01, .01, .01 );

            toulon.scale.set( .01, .01, .01 );
            toulon2.scale.set( .01, .01, .01 );

            verona.scale.set( .01, .01, .01 );
            verona2.scale.set( .01, .01, .01 );

        }

    });

    $('.lucca').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        selectedKluka = 'lucca';

        if ( kovincTest ) {

            luccapod.scale.set( 1, 1, 1 );
            luccapod2.scale.set( 1, 1, 1 );

            klucnotpod.scale.set( 1, 1, 1 );
            klucnotpod.scale.set( 1, 1, 1 );

            kluczunpod.scale.set( 1, 1, 1 );
            kluczunpod.scale.set( 1, 1, 1 );

            narvikpod.scale.set( .01, .01, .01 );
            narvikpod2.scale.set( .01, .01, .01 );

            modelwpod.scale.set( .01, .01, .01 );
            modelwpod2.scale.set( .01, .01, .01 );

            bremenpod.scale.set( .01, .01, .01 );
            bremenpod2.scale.set( .01, .01, .01 );

            toulonpod.scale.set( .01, .01, .01 );
            toulonpod2.scale.set( .01, .01, .01 );

            veronapod.scale.set( .01, .01, .01 );
            veronapod2.scale.set( .01, .01, .01 );

        } else {

            lucca.scale.set( 1, 1, 1 );
            lucca2.scale.set( 1, 1, 1 );

            klucnot.scale.set( 1, 1, 1 );
            klucnot.scale.set( 1, 1, 1 );

            kluczun.scale.set( 1, 1, 1 );
            kluczun.scale.set( 1, 1, 1 );

            narvik.scale.set( .01, .01, .01 );
            narvik2.scale.set( .01, .01, .01 );

            modelw.scale.set( .01, .01, .01 );
            modelw2.scale.set( .01, .01, .01 );

            bremen.scale.set( .01, .01, .01 );
            bremen2.scale.set( .01, .01, .01 );

            toulon.scale.set( .01, .01, .01 );
            toulon2.scale.set( .01, .01, .01 );

            verona.scale.set( .01, .01, .01 );
            verona2.scale.set( .01, .01, .01 );

        }

    });

    $('.modelw').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        selectedKluka = 'modelw';

        if ( kovincTest ) {

            modelwpod.scale.set( 1, 1, 1 );
            modelwpod2.scale.set( 1, 1, 1 );

            klucnotpod.scale.set( 1, 1, 1 );
            klucnotpod.scale.set( 1, 1, 1 );

            kluczunpod.scale.set( 1, 1, 1 );
            kluczunpod.scale.set( 1, 1, 1 );

            luccapod.scale.set( .01, .01, .01 );
            luccapod2.scale.set( .01, .01, .01 );

            narvikpod.scale.set( .01, .01, .01 );
            narvikpod2.scale.set( .01, .01, .01 );

            bremenpod.scale.set( .01, .01, .01 );
            bremenpod2.scale.set( .01, .01, .01 );

            toulonpod.scale.set( .01, .01, .01 );
            toulonpod2.scale.set( .01, .01, .01 );

            veronapod.scale.set( .01, .01, .01 );
            veronapod2.scale.set( .01, .01, .01 );

        } else {

            modelw.scale.set( 1, 1, 1 );
            modelw2.scale.set( 1, 1, 1 );

            klucnot.scale.set( 1, 1, 1 );
            klucnot.scale.set( 1, 1, 1 );

            kluczun.scale.set( 1, 1, 1 );
            kluczun.scale.set( 1, 1, 1 );

            lucca.scale.set( .01, .01, .01 );
            lucca2.scale.set( .01, .01, .01 );

            narvik.scale.set( .01, .01, .01 );
            narvik2.scale.set( .01, .01, .01 );

            bremen.scale.set( .01, .01, .01 );
            bremen2.scale.set( .01, .01, .01 );

            toulon.scale.set( .01, .01, .01 );
            toulon2.scale.set( .01, .01, .01 );

            verona.scale.set( .01, .01, .01 );
            verona2.scale.set( .01, .01, .01 );

        }

    });

    $('.bremen').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        selectedKluka = 'bremen';

        if ( kovincTest ) {

            bremenpod.scale.set( 1, 1, 1 );
            bremenpod2.scale.set( 1, 1, 1 );

            klucnotpod.scale.set( 1, 1, 1 );
            klucnotpod.scale.set( 1, 1, 1 );

            kluczunpod.scale.set( 1, 1, 1 );
            kluczunpod.scale.set( 1, 1, 1 );

            luccapod.scale.set( .01, .01, .01 );
            luccapod2.scale.set( .01, .01, .01 );

            modelwpod.scale.set( .01, .01, .01 );
            modelwpod2.scale.set( .01, .01, .01 );

            narvikpod.scale.set( .01, .01, .01 );
            narvikpod2.scale.set( .01, .01, .01 );

            toulonpod.scale.set( .01, .01, .01 );
            toulonpod2.scale.set( .01, .01, .01 );

            veronapod.scale.set( .01, .01, .01 );
            veronapod2.scale.set( .01, .01, .01 );

        } else {

            bremen.scale.set( 1, 1, 1 );
            bremen2.scale.set( 1, 1, 1 );

            klucnot.scale.set( 1, 1, 1 );
            klucnot.scale.set( 1, 1, 1 );

            kluczun.scale.set( 1, 1, 1 );
            kluczun.scale.set( 1, 1, 1 );

            lucca.scale.set( .01, .01, .01 );
            lucca2.scale.set( .01, .01, .01 );

            modelw.scale.set( .01, .01, .01 );
            modelw2.scale.set( .01, .01, .01 );

            narvik.scale.set( .01, .01, .01 );
            narvik2.scale.set( .01, .01, .01 );

            toulon.scale.set( .01, .01, .01 );
            toulon2.scale.set( .01, .01, .01 );

            verona.scale.set( .01, .01, .01 );
            verona2.scale.set( .01, .01, .01 );

        }

    });

    $('.verona').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        selectedKluka = 'verona';

        if ( kovincTest ) {

            veronapod.scale.set( 1, 1, 1 );
            veronapod2.scale.set( 1, 1, 1 );

            klucnotpod.scale.set( 1, 1, 1 );
            klucnotpod.scale.set( 1, 1, 1 );

            kluczunpod.scale.set( 1, 1, 1 );
            kluczunpod.scale.set( 1, 1, 1 );

            luccapod.scale.set( .01, .01, .01 );
            luccapod2.scale.set( .01, .01, .01 );

            modelwpod.scale.set( .01, .01, .01 );
            modelwpod2.scale.set( .01, .01, .01 );

            bremenpod.scale.set( .01, .01, .01 );
            bremenpod2.scale.set( .01, .01, .01 );

            toulonpod.scale.set( .01, .01, .01 );
            toulonpod2.scale.set( .01, .01, .01 );

            narvikpod.scale.set( .01, .01, .01 );
            narvikpod2.scale.set( .01, .01, .01 );

        } else {

            verona.scale.set( 1, 1, 1 );
            verona2.scale.set( 1, 1, 1 );

            klucnot.scale.set( 1, 1, 1 );
            klucnot.scale.set( 1, 1, 1 );

            kluczun.scale.set( 1, 1, 1 );
            kluczun.scale.set( 1, 1, 1 );

            lucca.scale.set( .01, .01, .01 );
            lucca2.scale.set( .01, .01, .01 );

            modelw.scale.set( .01, .01, .01 );
            modelw2.scale.set( .01, .01, .01 );

            bremen.scale.set( .01, .01, .01 );
            bremen2.scale.set( .01, .01, .01 );

            toulon.scale.set( .01, .01, .01 );
            toulon2.scale.set( .01, .01, .01 );

            narvik.scale.set( .01, .01, .01 );
            narvik2.scale.set( .01, .01, .01 );

        }

    });

    $('.toulon').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        selectedKluka = 'toulon';

        if ( kovincTest ) {

            toulonpod.scale.set( 1, 1, 1 );
            toulonpod2.scale.set( 1, 1, 1 );

            klucnotpod.scale.set( .01, .01, .01 );
            klucnotpod.scale.set( .01, .01, .01 );

            kluczunpod.scale.set( .01, .01, .01 );
            kluczunpod.scale.set( .01, .01, .01 );

            luccapod.scale.set( .01, .01, .01 );
            luccapod2.scale.set( .01, .01, .01 );

            modelwpod.scale.set( .01, .01, .01 );
            modelwpod2.scale.set( .01, .01, .01 );

            bremenpod.scale.set( .01, .01, .01 );
            bremenpod2.scale.set( .01, .01, .01 );

            narvikpod.scale.set( .01, .01, .01 );
            narvikpod2.scale.set( .01, .01, .01 );

            veronapod.scale.set( .01, .01, .01 );
            veronapod2.scale.set( .01, .01, .01 );

        } else {

            toulon.scale.set( 1, 1, 1 );
            toulon2.scale.set( 1, 1, 1 );

            klucnot.scale.set( .01, .01, .01 );
            klucnot.scale.set( .01, .01, .01 );

            kluczun.scale.set( .01, .01, .01 );
            kluczun.scale.set( .01, .01, .01 );

            lucca.scale.set( .01, .01, .01 );
            lucca2.scale.set( .01, .01, .01 );

            modelw.scale.set( .01, .01, .01 );
            modelw2.scale.set( .01, .01, .01 );

            bremen.scale.set( .01, .01, .01 );
            bremen2.scale.set( .01, .01, .01 );

            narvik.scale.set( .01, .01, .01 );
            narvik2.scale.set( .01, .01, .01 );

            verona.scale.set( .01, .01, .01 );
            verona2.scale.set( .01, .01, .01 );

        }

    });

    // KUKALA

    $('.kukalo').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        selectedDigitalno = false;

        if (! kovincTest ) {

            digkuk.scale.set( 0, 0, 0 );
            kukalozun.scale.set( 0, 0, 0 );

        } else {

            digkukpod.scale.set( 0, 0, 0 );
            digkukzunpod.scale.set( 0, 0, 0 );

        }

    });

    $('.digkuk').on('click tap', () => {

        if ( deleting ) {
            return;
        }

        selectedDigitalno = true;

        if (! kovincTest ) {

            digkuk.scale.set( 1, 1, 1 );
            kukalozun.scale.set( 1, 1, 1 );
        
        } else {

            digkukpod.scale.set( 1, 1, 1 );
            digkukzunpod.scale.set( 1, 1, 1 );

        }

    });

    // ROTATOR

    let r = 0;

    function rotate() {
        r = r ? 0 : 1;

        if (r === 1) {

            if ( kovincTest ) {

                camera.position.z = 1.05;  

            } else {

                camera.position.z = 0;

            }

            camera.position.x = 2.05;
            camera.position.y = .2;
            camera.lookAt(0,.1,0);
            turned = true;

        } else {

            if ( kovincTest ) {

                camera.position.z = -1.05;

            } else {

                camera.position.z = 0;

            }

            camera.position.x = -2.05;
            camera.position.y = .2;
            camera.lookAt(0,.1,0);
            turned = false;

        }

            return r;
    }

    $('.rotate_view').on('click tap', () => {

        rotate();

    });

    // WALL

    loader.load(
        './gltf/wall3.glb',

        function (gltf) {

            wall = gltf.scene;
            wallanim = gltf.animations;

            gltf.scene.position.set( 0, -1, 0 );
            gltf.scene.rotation.y = Math.PI / 2;
            scene.add(gltf.scene);

            wallblock = scene.getObjectByName( 'wallblock' );
            wallblock.scale.set( 1, 1, 1 );

        },
        function (xhr) {
    
        },
        function (error) {

            console.log('An error happened');

            const geometry = new THREE.BoxGeometry( 1, 1, 1 );
            const material = new THREE.MeshBasicMaterial( {color: 0x000000} );
            const cube = new THREE.Mesh( geometry, material );
            scene.add( cube );
    
        }
    );

    // FLOOR

    loader.load(
        './gltf/floor.glb',

        function (gltf) {

            gltf.scene.position.set(0,-1,0);
            gltf.scene.rotation.y = Math.PI / 2;
            scene.add(gltf.scene);

        },
        function (xhr) {
    
        },
        function (error) {

            console.log('An error happened');

            const geometry = new THREE.BoxGeometry( 1, 1, 1 );
            const material = new THREE.MeshBasicMaterial( {color: 0x000000} );
            const cube = new THREE.Mesh( geometry, material );
            scene.add( cube );
    
        }
    );

    loader.load(
        './gltf/wood-floor.glb', // WOOD FLOOR

        function (gltf) {

            gltf.scene.position.set(0,-1,0);
            gltf.scene.rotation.y = Math.PI / 2;
            scene.add(gltf.scene);

        },
        function (xhr) {
    
        },
        function (error) {

            console.log('An error happened');

            const geometry = new THREE.BoxGeometry( 1, 1, 1 );
            const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const cube = new THREE.Mesh( geometry, material );
            scene.add( cube );
    
        }
    );

    // CLOCK

    clock = new THREE.Clock();

    // LIGHTS

    const light = new THREE.AmbientLight( 0xffffff ); // soft white light
    scene.add( light );

    const pointLight = new THREE.PointLight( 0x404040, 20 );
    pointLight.position.z = 5;
    pointLight.position.x = -3;
    pointLight.position.y = 2;

    const pointLight3 = new THREE.PointLight( 0x404040, 20 );
    pointLight3.position.x = -5;
    pointLight3.position.y = 2;

    const pointLight4 = new THREE.PointLight( 0x404040, 20 );
    pointLight4.position.z = -5;
    pointLight4.position.x = -3;
    pointLight4.position.y = 2;

    const pointLight2 = new THREE.PointLight( 0x404040, 20 );
    pointLight2.position.x = 5;
    pointLight2.position.y = 2;

    const pointLight6 = new THREE.PointLight( 0x404040, 20 );
    pointLight6.position.z = -5;
    pointLight6.position.x = 3;
    pointLight6.position.y = 2;

    const pointLight7 = new THREE.PointLight( 0x404040, 20 );
    pointLight7.position.z = 5;
    pointLight7.position.x = 3;
    pointLight7.position.y = 2;

    const pointLight5 = new THREE.PointLight( 0x404040, 20 );
    pointLight5.position.y = 5;
    pointLight5.position.y = 2;
    scene.add( pointLight, pointLight2, pointLight3, pointLight4, pointLight5, pointLight6, pointLight7 );

    // CAMERA POSITION

    camera.position.x = -2.05;
    camera.position.y = .2;

    camera.lookAt( 0, .1, 0 );

    // STATS

    console.log( renderer.info );

    raycaster = new THREE.Raycaster();
    window.addEventListener('click', raycast, false );


}

function animate() {
    requestAnimationFrame( animate );

    var delta = clock.getDelta();
    
    if ( mixer ) mixer.update( delta );

    if ( mixer2 ) mixer2.update( delta );

    renderer.render( scene, camera );
}

function raycast ( e ) {

    if ( ringing ) return;

    let mouse = new THREE.Vector2();

    mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera( mouse, camera );    

    var intersects = raycaster.intersectObjects( scene.children, true );

    for ( var i = 0; i < intersects.length; i++ ) {

        let zvonc = scene.getObjectByName( 'zvoncnotr' );

        if ( intersects[ i ].object.parent == zvonc ) {

            mixer2 = new THREE.AnimationMixer( wall );
            const clips = wallanim;

            mixer2.stopAllAction();

            audio.play();

            const clip = THREE.AnimationClip.findByName( clips, 'zvoncnotrAction.001' );
            const action2 = mixer2.clipAction( clip );
            action2.setLoop( THREE.LoopOnce );
            action2.reset().play();

            ringing = true;

            setTimeout( () => ringing = false, 7000 );

        }
        
        if ( intersects[ i ] ) return;

    }

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener( 'resize', onWindowResize, false );

//LOAD SCREEN

function load_screen_update_file() {
    loadText.innerHTML = Math.round( global.fileStatus ) + '% Naloženo';
    loadlogo.style.clipPath = 'polygon(0 0, ' + Math.round( global.fileStatus ) + '% 0, ' + Math.round( global.fileStatus ) + '% 100%, 0% 100%)';
}

function load_screen_update() {
    loadText.innerHTML = Math.round( global.loadStatus ) + '% Pripravljeno';
    loadlogo.style.clipPath = 'polygon(0 0, ' + Math.round( global.loadStatus ) + '% 0, ' + Math.round( global.loadStatus ) + '% 100%, 0% 100%)';
}

function load_screen_finish() {
    loadText.innerHTML = '100% Pripravljeno';
    loadlogo.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)';
    setTimeout(() => {
        load.style.display = 'none'
    }, 5000);
}