let albumsData = JSON.parse(localStorage.getItem('albumsData')) || [];

function saveData() {
    localStorage.setItem('albumsData', JSON.stringify(albumsData));
}

function renderAlbums() {
    const albumsContainer = document.getElementById('albums');
    albumsContainer.innerHTML = '';
    albumsData.forEach((album, index) => {
        const div = document.createElement('div');
        div.className = 'album';
        div.innerHTML = `
            <h2>${album.name}</h2>
            <canvas id="chart-${index}" width="180" height="100"></canvas>
            <button onclick="openAlbum(${index})">เข้าสู่อัลบั้ม</button>
            <button class="deleteBtn" onclick="deleteAlbum(${index})">ลบอัลบั้ม</button>
        `;
        albumsContainer.appendChild(div);
        drawChart(`chart-${index}`, album.used, album.max);
    });
}

function drawChart(canvasId, used, max) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const percentage = used / max;

    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = '#444';
    ctx.fillRect(0,40,180,20);

    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(0,40,180 * percentage,20);

    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText(`${used.toFixed(2)}MB / ${max}MB`, 50, 35);
}

function createAlbum(){
    const name = document.getElementById('albumName').value.trim();
    if(name){
        albumsData.push({ name: name, used:0, max:500, files:[] });
        saveData();
        renderAlbums();
        document.getElementById('albumName').value = '';
    } else {
        alert('กรุณาใส่ชื่ออัลบั้ม');
    }
}

function deleteAlbum(index){
    if(confirm(`คุณแน่ใจหรือว่าต้องการลบอัลบั้ม "${albumsData[index].name}"?`)){
        albumsData.splice(index,1);
        saveData();
        renderAlbums();
    }
}

function openAlbum(index){
    const album = albumsData[index];
    const main = document.getElementById('main');
    main.innerHTML = `
        <div style="text-align:center;">
            <h2>${album.name}</h2>
            <input type="file" id="uploadFile" multiple>
            <div id="preview"></div>
            <canvas id="chart-${index}" width="300" height="20"></canvas>
            <button onclick="back()">กลับ</button>
        </div>
    `;

    const uploadInput = document.getElementById('uploadFile');
    const preview = document.getElementById('preview');
    drawChart(`chart-${index}`, album.used, album.max);

    // แสดงไฟล์เก่า
    album.files.forEach(f=>{
        const element = document.createElement(f.type.startsWith('image')?'img':'video');
        element.src = f.data;
        element.width = f.type.startsWith('image')?100:150;
        element.height = 100;
        if(f.type.startsWith('video')) element.controls = true;
        preview.appendChild(element);
    });

    uploadInput.addEventListener('change', function(){
        Array.from(this.files).forEach(file=>{
            const reader = new FileReader();
            reader.onload = function(e){
                let element;
                if(file.type.startsWith('image')){
                    element = document.createElement('img');
                    element.src = e.target.result;
                    element.width = 100;
                    element.height = 100;
                } else if(file.type.startsWith('video')){
                    element = document.createElement('video');
                    element.src = e.target.result;
                    element.controls = true;
                    element.width = 150;
                    element.height = 100;
                }
                preview.appendChild(element);

                // บันทึกไฟล์ลงอัลบั้ม
                const sizeMB = (file.size / 1024 / 1024);
                album.files.push({ name:file.name, size:sizeMB, data:e.target.result, type:file.type });
                album.used = album.files.reduce((sum,f)=>sum+f.size,0);
                saveData();
                drawChart(`chart-${index}`, album.used, album.max);
            }
            reader.readAsDataURL(file);
        });
    });
}

function back(){
    const main = document.getElementById('main');
    main.innerHTML = `
        <h1>My Albums</h1>
        <div id="newAlbum">
            <input type="text" id="albumName" placeholder="ชื่ออัลบั้ม">
            <button onclick="createAlbum()">สร้างอัลบั้ม</button>
        </div>
        <div id="albums" class="albums"></div>
    `;
    renderAlbums();
}

renderAlbums();
