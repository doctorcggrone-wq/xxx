let db;
const DB_NAME = "MyAlbumsDB";
const DB_VERSION = 1;
const STORE_NAME = "albums";
const MAX_GB = 20; // max 20GB ต่ออัลบั้ม

// เปิด IndexedDB
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = function(e) {
    db = e.target.result;
    if(!db.objectStoreNames.contains(STORE_NAME)){
        const store = db.createObjectStore(STORE_NAME, { keyPath: "name" });
        store.createIndex("name", "name", { unique: true });
    }
};

request.onsuccess = function(e) {
    db = e.target.result;
    renderAlbums();
};

request.onerror = function(e) {
    alert("IndexedDB ไม่สามารถเปิดได้");
};

// สร้างอัลบั้ม
function createAlbum(){
    const name = document.getElementById('albumName').value.trim();
    if(!name) { alert("กรุณาใส่ชื่ออัลบั้ม"); return; }
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.add({ name, files: [], used:0, max: MAX_GB*1024 }); // เก็บ max เป็น MB
    tx.oncomplete = ()=> {
        document.getElementById('albumName').value='';
        renderAlbums();
    };
    tx.onerror = ()=> alert("สร้างอัลบั้มไม่สำเร็จ (ซ้ำชื่อหรือผิดพลาด)");
}

// ลบอัลบั้ม
function deleteAlbum(name){
    if(confirm(`คุณแน่ใจว่าจะลบอัลบั้ม "${name}" ?`)){
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(name);
        tx.oncomplete = ()=> renderAlbums();
    }
}

// ดึงอัลบั้มทั้งหมดและแสดง
function renderAlbums(){
    const albumsContainer = document.getElementById('albums');
    albumsContainer.innerHTML = '';
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    store.openCursor().onsuccess = function(e){
        const cursor = e.target.result;
        if(cursor){
            const album = cursor.value;
            const div = document.createElement('div');
            div.className = 'album';
            div.innerHTML = `
                <h2>${album.name}</h2>
                <canvas id="chart-${album.name}" width="180" height="100"></canvas>
                <button onclick="openAlbum('${album.name}')">เข้าสู่อัลบั้ม</button>
                <button class="deleteBtn" onclick="deleteAlbum('${album.name}')">ลบอัลบั้ม</button>
            `;
            albumsContainer.appendChild(div);
            drawChart(`chart-${album.name}`, album.used, album.max);
            cursor.continue();
        }
    };
}

// วาดกราฟ Progress Bar (GB)
function drawChart(canvasId, used, max){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const percentage = used / max;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#444';
    ctx.fillRect(0,40,canvas.width,20);
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(0,40,canvas.width * percentage,20);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText(`${(used/1024).toFixed(2)}GB / ${MAX_GB}GB`, 10, 35);
}

// เปิดอัลบั้ม
function openAlbum(name){
    const main = document.getElementById('main');
    main.innerHTML = `
        <div style="text-align:center;">
            <h2>${name}</h2>
            <input type="file" id="uploadFile" multiple>
            <div id="preview"></div>
            <canvas id="chart-${name}" width="300" height="20"></canvas>
            <button onclick="back()">กลับ</button>
        </div>
    `;
    const uploadInput = document.getElementById('uploadFile');
    const preview = document.getElementById('preview');

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(name);
    getReq.onsuccess = function(e){
        const album = e.target.result;
        album.files.forEach((f, idx)=>{
            addPreviewItem(f, album, idx, preview);
        });
        drawChart(`chart-${name}`, album.used, album.max);
    };

    uploadInput.addEventListener('change', function(){
        Array.from(this.files).forEach(file=>{
            const reader = new FileReader();
            reader.onload = function(){
                const blob = new Blob([file], {type: file.type});
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                const getReq = store.get(name);
                getReq.onsuccess = function(e){
                    const album = e.target.result;
                    album.files.push({ name:file.name, type:file.type, data: blob, size:file.size/(1024*1024) });
                    album.used = album.files.reduce((sum,f)=>sum+f.size,0);
                    store.put(album);
                    addPreviewItem(album.files[album.files.length-1], album, album.files.length-1, preview);
                    drawChart(`chart-${name}`, album.used, album.max);
                };
            };
            reader.readAsArrayBuffer(file);
        });
    });
}

// เพิ่มไฟล์ Preview + ลบไฟล์ได้
function addPreviewItem(f, album, idx, preview){
    const div = document.createElement('div');
    div.className = 'preview-item';
    const element = f.type.startsWith('image') ? document.createElement('img') : document.createElement('video');
    element.src = URL.createObjectURL(f.data);
    element.width = f.type.startsWith('image')?100:150;
    element.height = 100;
    if(f.type.startsWith('video')) element.controls=true;
    div.appendChild(element);

    const removeBtn = document.createElement('button');
    removeBtn.className='remove-file';
    removeBtn.innerText='×';
    removeBtn.title = `${f.name} (${(f.size/1024).toFixed(2)} GB)`;
    removeBtn.onclick = ()=>{
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(album.name);
        getReq.onsuccess = function(e){
            const alb = e.target.result;
            alb.files.splice(idx,1);
            alb.used = alb.files.reduce((sum,f)=>sum+f.size,0);
            store.put(alb);
            div.remove();
            drawChart(`chart-${album.name}`, alb.used, alb.max);
        };
    };
    div.appendChild(removeBtn);

    preview.appendChild(div);
}

function back(){
    document.getElementById('main').innerHTML = `
        <h1>My Albums</h1>
        <div id="newAlbum">
            <input type="text" id="albumName" placeholder="ชื่ออัลบั้ม">
            <button onclick="createAlbum()">สร้างอัลบั้ม</button>
        </div>
        <div id="albums" class="albums"></div>
    `;
    renderAlbums();
}
