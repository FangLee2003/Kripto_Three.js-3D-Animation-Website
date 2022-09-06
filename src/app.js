import * as THREE from 'three';
import {WEBGL} from './resources/WebGL';
import * as Ammo from './builds/ammo';
import {
    boardTextures,
    boxTexture,
    inputText,
    URL,
    stoneTexture,
    woodTexture,
} from './resources/textures';

import {
    setupEventHandlers,
    moveDirection,
    isTouchscreenDevice,
    touchEvent,
    createJoystick,
} from './resources/eventHandlers';

import {
    preloadDivs,
    preloadOpacity,
    postloadDivs,
    startScreenDivs,
    startButton,
    noWebGL,
    fadeOutDivs,
} from './resources/preload';

import {
    clock,
    scene,
    camera,
    renderer,
    stats,
    manager,
    createWorld,
    lensFlareObject,
    createLensFlare,
    particleGroup,
    particleAttributes,
    particleSystemObject,
    glowingParticles,
    addParticles,
    moveParticles,
    generateGalaxy,
    galaxyMaterial,
    galaxyClock,
    galaxyPoints,
} from './resources/world';

import {
    simpleText,
    floatingLabel,
    allLanguages,
    createTextOnPlane,
} from './resources/surfaces';

import {
    pickPosition,
    launchClickPosition,
    getCanvasRelativePosition,
    rotateCamera,
    launchHover,
} from './resources/utils';

export let cursorHoverObjects = [];

// start Ammo Engine
Ammo().then((Ammo) => {
    //Ammo.js variable declaration
    let rigidBodies = [],
        physicsWorld;

    //Ammo Dynamic bodies for ball
    let ballObject = null;
    const STATE = {DISABLE_DEACTIVATION: 4};

    //default transform object
    let tmpTrans = new Ammo.btTransform();

    // list of hyperlink objects
    var objectsWithLinks = [];

    //function to create physics world with Ammo.js
    function createPhysicsWorld() {
        //algortihms for full (not broadphase) collision detection
        let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
            dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration), // dispatch calculations for overlapping pairs/ collisions.
            overlappingPairCache = new Ammo.btDbvtBroadphase(), //broadphase collision detection list of all possible colliding pairs
            constraintSolver = new Ammo.btSequentialImpulseConstraintSolver(); //causes the objects to interact properly, like gravity, game logic forces, collisions

        // see bullet physics docs for info
        physicsWorld = new Ammo.btDiscreteDynamicsWorld(
            dispatcher,
            overlappingPairCache,
            constraintSolver,
            collisionConfiguration
        );

        // add gravity
        physicsWorld.setGravity(new Ammo.btVector3(0, -50, 0));
    }

    //create flat plane
    function createGridPlane() {
        // block properties
        let pos = {x: 0, y: -0.25, z: 0};
        let scale = {x: 175, y: 0.5, z: 175};
        let quat = {x: 0, y: 0, z: 0, w: 1};
        let mass = 0; //mass of zero = infinite mass

        //create grid overlay on plane
        var grid = new THREE.GridHelper(175, 20, 0xffffff, 0xffffff);
        grid.material.opacity = 0.5;
        grid.material.transparent = true;
        grid.position.y = 0.005;
        scene.add(grid);

        //Create Threejs Plane
        let blockPlane = new THREE.Mesh(
            new THREE.BoxBufferGeometry(),
            new THREE.MeshPhongMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.25,
            })
        );
        blockPlane.position.set(pos.x, pos.y, pos.z);
        blockPlane.scale.set(scale.x, scale.y, scale.z);
        blockPlane.receiveShadow = true;
        scene.add(blockPlane);

        //Ammo.js Physics
        let transform = new Ammo.btTransform();
        transform.setIdentity(); // sets safe default values
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(
            new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
        );
        let motionState = new Ammo.btDefaultMotionState(transform);

        //setup collision box
        let colShape = new Ammo.btBoxShape(
            new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
        );
        colShape.setMargin(0.05);

        let localInertia = new Ammo.btVector3(0, 0, 0);
        colShape.calculateLocalInertia(mass, localInertia);

        //  provides information to create a rigid body
        let rigidBodyStruct = new Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            colShape,
            localInertia
        );
        let body = new Ammo.btRigidBody(rigidBodyStruct);
        body.setFriction(10);
        body.setRollingFriction(10);

        // add to world
        physicsWorld.addRigidBody(body);
    }

    //generic function to add physics to Mesh with scale
    function addRigidPhysics(item, itemScale) {
        let pos = {x: item.position.x, y: item.position.y, z: item.position.z};
        let scale = {x: itemScale.x, y: itemScale.y, z: itemScale.z};
        let quat = {x: 0, y: 0, z: 0, w: 1};
        let mass = 0;
        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(
            new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
        );

        var localInertia = new Ammo.btVector3(0, 0, 0);
        var motionState = new Ammo.btDefaultMotionState(transform);
        let colShape = new Ammo.btBoxShape(
            new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
        );
        colShape.setMargin(0.05);
        colShape.calculateLocalInertia(mass, localInertia);
        let rbInfo = new Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            colShape,
            localInertia
        );
        let body = new Ammo.btRigidBody(rbInfo);
        body.setActivationState(STATE.DISABLE_DEACTIVATION);
        body.setCollisionFlags(2);
        physicsWorld.addRigidBody(body);
    }

    function renderFrame() {
        // FPS stats module
        stats.begin();

        const elapsedTime = galaxyClock.getElapsedTime() + 150;

        let deltaTime = clock.getDelta();
        if (!isTouchscreenDevice())
            if (document.hasFocus()) {
                moveBall();
            } else {
                moveDirection.forward = 0;
                moveDirection.back = 0;
                moveDirection.left = 0;
                moveDirection.right = 0;
            }
        else {
            moveBall();
        }

        updatePhysics(deltaTime);

        moveParticles();

        renderer.render(scene, camera);
        stats.end();

        galaxyMaterial.uniforms.uTime.value = elapsedTime * 5;
        //galaxyPoints.position.set(-50, -50, 0);

        // tells browser theres animation, update before the next repaint
        requestAnimationFrame(renderFrame);
    }

    //loading page section
    function startButtonEventListener() {
        for (let i = 0; i < fadeOutDivs.length; i++) {
            fadeOutDivs[i].classList.add('fade-out');
        }
        setTimeout(() => {
            document.getElementById('preload-overlay').style.display = 'none';
        }, 750);

        startButton.removeEventListener('click', startButtonEventListener);
        document.addEventListener('click', launchClickPosition);

        setTimeout(() => {
            document.addEventListener('mousemove', launchHover);
        }, 1000);
    }

    function updatePhysics(deltaTime) {
        // Step world
        physicsWorld.stepSimulation(deltaTime, 10);

        // Update rigid bodies
        for (let i = 0; i < rigidBodies.length; i++) {
            let objThree = rigidBodies[i];
            let objAmmo = objThree.userData.physicsBody;
            let ms = objAmmo.getMotionState();
            if (ms) {
                ms.getWorldTransform(tmpTrans);
                let p = tmpTrans.getOrigin();
                let q = tmpTrans.getRotation();
                objThree.position.set(p.x(), p.y(), p.z());
                objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }
        }

        //check to see if ball escaped the plane
        if (ballObject.position.y < -50) {
            scene.remove(ballObject);
            createBall();
        }

        //check to see if ball is on text to rotate camera
        rotateCamera(ballObject);
    }

    //document loading
    manager.onStart = function (item, loaded, total) {
        //console.log("Loading started");
    };

    manager.onLoad = function () {
        var readyStateCheckInterval = setInterval(function () {
            if (document.readyState === 'complete') {
                clearInterval(readyStateCheckInterval);
                for (let i = 0; i < preloadDivs.length; i++) {
                    preloadDivs[i].style.visibility = 'hidden'; // or
                    preloadDivs[i].style.display = 'none';
                }
                for (let i = 0; i < postloadDivs.length; i++) {
                    postloadDivs[i].style.visibility = 'visible'; // or
                    postloadDivs[i].style.display = 'block';
                }
            }
        }, 1000);
        //console.log("Loading complete");
    };

    manager.onError = function (url) {
        //console.log("Error loading");
    };

    startButton.addEventListener('click', startButtonEventListener);

    if (isTouchscreenDevice()) {
        document.getElementById('appDirections').innerHTML =
            'Use the joystick in the bottom left to move the ball. Please use your device in portrait orientation!';
        createJoystick(document.getElementById('joystick-wrapper'));
        document.getElementById('joystick-wrapper').style.visibility = 'visible';
        document.getElementById('joystick').style.visibility = 'visible';
    }

    //create X axis wall around entire plane
    function createWallX(x, y, z) {
        const wallScale = {x: 0.125, y: 4, z: 175};

        const wall = new THREE.Mesh(
            new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                opacity: 0.75,
                transparent: true,
            })
        );

        wall.position.x = x;
        wall.position.y = y;
        wall.position.z = z;

        wall.receiveShadow = true;

        scene.add(wall);

        addRigidPhysics(wall, wallScale);
    }

    //create Z axis wall around entire plane
    function createWallZ(x, y, z) {
        const wallScale = {x: 175, y: 4, z: 0.125};

        const wall = new THREE.Mesh(
            new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                opacity: 0.75,
                transparent: true,
            })
        );

        wall.position.x = x;
        wall.position.y = y;
        wall.position.z = z;

        wall.receiveShadow = true;

        scene.add(wall);

        addRigidPhysics(wall, wallScale);
    }

    // create ball
    function createBall() {
        let pos = {x: 0, y: 0, z: 50};
        let radius = 2;
        let quat = {x: 0, y: 0, z: 0, w: 1};
        let mass = 3;

        var marble_loader = new THREE.TextureLoader(manager);
        var marbleTexture = marble_loader.load('./src/jsm/bitcoin.png');
        marbleTexture.wrapS = marbleTexture.wrapT = THREE.RepeatWrapping;
        marbleTexture.repeat.set(1, 1);
        marbleTexture.anisotropy = 1;
        marbleTexture.encoding = THREE.sRGBEncoding;

        //threeJS Section
        let ball = (ballObject = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 32, 32),
            new THREE.MeshLambertMaterial({map: marbleTexture})
        ));

        ball.geometry.computeBoundingSphere();
        ball.geometry.computeBoundingBox();

        ball.position.set(pos.x, pos.y, pos.z);

        ball.castShadow = true;
        ball.receiveShadow = true;

        scene.add(ball);

        //Ammojs Section
        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(
            new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
        );
        let motionState = new Ammo.btDefaultMotionState(transform);

        let colShape = new Ammo.btSphereShape(radius);
        colShape.setMargin(0.05);

        let localInertia = new Ammo.btVector3(0, 0, 0);
        colShape.calculateLocalInertia(mass, localInertia);

        let rbInfo = new Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            colShape,
            localInertia
        );
        let body = new Ammo.btRigidBody(rbInfo);
        //body.setFriction(4);
        body.setRollingFriction(10);

        //set ball friction

        //once state is set to disable, dynamic interaction no longer calculated
        body.setActivationState(STATE.DISABLE_DEACTIVATION);

        physicsWorld.addRigidBody(
            body //collisionGroupRedBall, collisionGroupGreenBall | collisionGroupPlane
        );

        ball.userData.physicsBody = body;
        ballObject.userData.physicsBody = body;

        rigidBodies.push(ball);
        rigidBodies.push(ballObject);
    }

    function moveBall() {
        let scalingFactor = 20;
        let moveX = moveDirection.right - moveDirection.left;
        let moveZ = moveDirection.back - moveDirection.forward;
        let moveY = 0;

        if (ballObject.position.y < 2.01) {
            moveX = moveDirection.right - moveDirection.left;
            moveZ = moveDirection.back - moveDirection.forward;
            moveY = 0;
        } else {
            moveX = moveDirection.right - moveDirection.left;
            moveZ = moveDirection.back - moveDirection.forward;
            moveY = -0.25;
        }

        // no movement
        if (moveX == 0 && moveY == 0 && moveZ == 0) return;

        let resultantImpulse = new Ammo.btVector3(moveX, moveY, moveZ);
        resultantImpulse.op_mul(scalingFactor);
        let physicsBody = ballObject.userData.physicsBody;
        physicsBody.setLinearVelocity(resultantImpulse);
    }

    function loadTitle() {
        var text_loader = new THREE.FontLoader();

        text_loader.load('./src/jsm/Roboto_Regular.json', function (font) {
            var xMid, text;

            var color = 0x0f0c29;

            var textMaterials = [
                new THREE.MeshBasicMaterial({color: color}), // front
                new THREE.MeshPhongMaterial({color: color}), // side
            ];

            var geometry = new THREE.TextGeometry('KRIPTO', {
                font: font,
                size: 12,
                height: 2,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.1,
                bevelSize: 0.11,
                bevelOffset: 0,
                bevelSegments: 1,
            });

            geometry.computeBoundingBox();
            geometry.computeVertexNormals();

            xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

            geometry.translate(xMid, 0, 0);

            var textGeo = new THREE.BufferGeometry().fromGeometry(geometry);

            text = new THREE.Mesh(geometry, textMaterials);
            text.position.z = -10;
            text.position.y = 0.1;
            text.receiveShadow = true;
            text.castShadow = true;

            scene.add(text);

            addRigidPhysics(text, {x: 60, y: 20, z: 1});
        });
    }

    //create "software engineer text"
    function loadSubtitle() {
        var text_loader = new THREE.FontLoader();

        text_loader.load('./src/jsm/Roboto_Regular.json', function (font) {
            var xMid, text;

            var color = 0xffffff;

            var textMaterials = [
                new THREE.MeshBasicMaterial({color: color}), // front
                new THREE.MeshPhongMaterial({color: color}), // side
            ];

            var geometry = new THREE.TextGeometry('Chang giong ai', {
                font: font,
                size: 6,
                height: 1,
                curveSegments: 20,
                bevelEnabled: true,
                bevelThickness: 0.25,
                bevelSize: 0.1,
            });

            geometry.computeBoundingBox();
            geometry.computeVertexNormals();

            xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

            geometry.translate(xMid, 0, 0);

            var textGeo = new THREE.BufferGeometry().fromGeometry(geometry);

            text = new THREE.Mesh(textGeo, textMaterials);
            text.position.y = 0.1;
            text.receiveShadow = true;
            text.castShadow = true;

            scene.add(text);

            addRigidPhysics(text, {x: 60, y: 10, z: 1});
        });
    }

    //create link boxes
    function createBox(
        x,
        y,
        z,
        scaleX,
        scaleY,
        scaleZ,
        boxTexture,
        URLLink,
        color = 0x000000,
        transparent = true
    ) {
        const boxScale = {x: scaleX, y: scaleY, z: scaleZ};
        let quat = {x: 0, y: 0, z: 0, w: 1};
        let mass = 0; //mass of zero = infinite mass

        //load link logo
        const loader = new THREE.TextureLoader(manager);
        const texture = loader.load(boxTexture);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.encoding = THREE.sRGBEncoding;
        const loadedTexture = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: transparent,
            color: 0xffffff,
        });

        var borderMaterial = new THREE.MeshBasicMaterial({
            color: color,
        });
        borderMaterial.color.convertSRGBToLinear();

        var materials = [
            borderMaterial, // Left side
            borderMaterial, // Right side
            borderMaterial, // Top side   ---> THIS IS THE FRONT
            borderMaterial, // Bottom side --> THIS IS THE BACK
            loadedTexture, // Front side
            borderMaterial, // Back side
        ];

        const linkBox = new THREE.Mesh(
            new THREE.BoxBufferGeometry(boxScale.x, boxScale.y, boxScale.z),
            materials
        );
        linkBox.position.set(x, y, z);
        linkBox.renderOrder = 1;
        linkBox.castShadow = true;
        linkBox.receiveShadow = true;
        linkBox.userData = {URL: URLLink, email: URLLink};
        scene.add(linkBox);
        objectsWithLinks.push(linkBox.uuid);

        addRigidPhysics(linkBox, boxScale);

        cursorHoverObjects.push(linkBox);
    }

    //function to create board
    function createHorizontalBoard(
        x,
        y,
        z,
        textureImage = boardTextures.grassImage,
        urlLink,
        rotation = 0
    ) {
        const boardSignScale = {x: 30, y: 15, z: 1};

        /* default texture loading */
        const loader = new THREE.TextureLoader(manager);

        const texture = loader.load(textureImage);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.encoding = THREE.sRGBEncoding;
        var borderMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
        });
        const loadedTexture = new THREE.MeshBasicMaterial({
            map: texture,
        });

        var materials = [
            borderMaterial, // Left side
            borderMaterial, // Right side
            borderMaterial, // Top side   ---> THIS IS THE FRONT
            borderMaterial, // Bottom side --> THIS IS THE BACK
            loadedTexture, // Front side
            borderMaterial, // Back side
        ];
        // order to add materials: x+,x-,y+,y-,z+,z-
        const boardSign = new THREE.Mesh(
            new THREE.BoxGeometry(
                boardSignScale.x,
                boardSignScale.y,
                boardSignScale.z
            ),
            materials
        );

        boardSign.position.x = x;
        boardSign.position.y = y + 10;
        boardSign.position.z = z;

        /* Rotate Billboard */
        boardSign.rotation.y = rotation;

        boardSign.castShadow = true;
        boardSign.receiveShadow = true;

        boardSign.userData = {URL: urlLink};

        scene.add(boardSign);

        addRigidPhysics(boardSign, boardSignScale);

        cursorHoverObjects.push(boardSign);
    }

    //create vertical board
    function createVerticalBoard(
        x,
        y,
        z,
        textureImage = boardTextures.grassImage,
        urlLink,
        rotation = 0
    ) {
        const boardSignScale = {x: 10, y: 15, z: 1};

        /* default texture loading */
        const loader = new THREE.TextureLoader(manager);

        const texture = loader.load(textureImage);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.encoding = THREE.sRGBEncoding;
        var borderMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
        });
        const loadedTexture = new THREE.MeshBasicMaterial({
            map: texture,
        });

        var materials = [
            borderMaterial, // Left side
            borderMaterial, // Right side
            borderMaterial, // Top side   ---> THIS IS THE FRONT
            borderMaterial, // Bottom side --> THIS IS THE BACK
            loadedTexture, // Front side
            borderMaterial, // Back side
        ];
        // order to add materials: x+,x-,y+,y-,z+,z-
        const boardSign = new THREE.Mesh(
            new THREE.BoxGeometry(
                boardSignScale.x,
                boardSignScale.y,
                boardSignScale.z
            ),
            materials
        );

        boardSign.position.x = x;
        boardSign.position.y = y + 11.25;
        boardSign.position.z = z;

        /* Rotate Billboard */
        boardSign.rotation.y = rotation;

        boardSign.castShadow = true;
        boardSign.receiveShadow = true;

        boardSign.userData = {URL: urlLink};

        scene.add(boardSign);

        addRigidPhysics(boardSign, boardSignScale);

        cursorHoverObjects.push(boardSign);
    }

    //initialize world and begin
    function start() {
        createWorld();
        createPhysicsWorld();

        createWallX(87.5, 1.75, 0);
        createWallX(-87.5, 1.75, 0);
        createWallZ(0, 1.75, 87.5);
        createWallZ(0, 1.75, -87.5);

        createGridPlane();
        createBall();

        //lensflare
        createLensFlare(50, -50, -800, 200, 200, boxTexture.lensFlareMain);
        addParticles();
        glowingParticles();
        generateGalaxy();

        loadTitle();
        loadSubtitle();

        createHorizontalBoard(
            -70,
            2.5,
            -70,
            boardTextures.marketcap,
            URL.marketcap
        );

        createHorizontalBoard(
            -30,
            2.5,
            -70,
            boardTextures.news,
            URL.news
        );

        createVerticalBoard(
            0,
            1.25,
            -70,
            boardTextures.login,
            URL.login
        );

        createBox(
            20,
            10,
            -70,
            10,
            10,
            1,
            boxTexture.github,
            URL.gitHub,
            0x000000,
            true
        );

        createBox(
            40,
            10,
            -70,
            10,
            10,
            1,
            boxTexture.linkedin,
            URL.linkedin,
            0x0077b5,
            true
        );

        createBox(
            60,
            10,
            -70,
            10,
            10,
            1,
            boxTexture.youtube,
            URL.youtube,
            0xFF0000,
            false
        );

        createBox(
            80,
            10,
            -70,
            10,
            10,
            1,
            boxTexture.blog,
            URL.blog,
            0xFF5722,
            false
        );

        createBox(-50, 5, 50, 5, 5, 1, boxTexture.html, "", 0xe34c24, false);
        createBox(-50, 5, 25, 5, 5, 1, boxTexture.css, "", 0x0c5c9c, false);
        createBox(-50, 5, -25, 5, 5, 1, boxTexture.bootstrap, "", 0x7910f8, false);
        createBox(-50, 5, -50, 5, 5, 1, boxTexture.threejs, "", 0xFFFFFF, false);

        createBox(50, 5, 50, 5, 5, 1, boxTexture.javascript, "", 0xf7df1e, false);
        createBox(50, 5, 25, 5, 5, 1, boxTexture.reactjs, "", 0x222222, false);
        createBox(50, 5, -25, 5, 5, 1, boxTexture.nodejs, "", 0x2c2c2c, false);
        createBox(50, 5, -50, 5, 5, 1, boxTexture.mongodb, "", 0xFFFFFF, false);

        let touchText, moveText;
        if (isTouchscreenDevice()) {
            touchText = 'Touch boxes with your \nfinger to open links';
            moveText =
                'Use the joystick in the bottom \nleft of the screen to move the ball.';
        } else {
            touchText = 'Click on boxes with \nthe mouse to open links';
            moveText =
                'Use the arrow keys on your \n keyboard to move the ball.';
        }
        let mottoText = 'Steve Jobs'
            + '\n\nSimple can be harder than complex: '
            + '\nYou have to work hard to get your thinking clean to make it simple. '
            + '\nBut it’s worth it in the end because once you get there, you can move mountains.';

        simpleText(0, 0.01, 10, moveText, 1.5);
        simpleText(0, 0.01, -50, touchText, 1.5);
        simpleText(0, 0.01, 50, mottoText, 1)
        setupEventHandlers();
        // window.addEventListener('mousemove', onDocumentMouseMove, false);
        renderFrame();
    }

    //check if user's browser has WebGL capabilities
    if (WEBGL.isWebGLAvailable()) {
        start();
    } else {
        noWebGL();
    }
});
