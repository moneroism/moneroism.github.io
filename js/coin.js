// pre-rendered monero coin sprite for canvas stuff
const M = new Path2D('M15 70V24l35 35 35-35v46H72V51L50 73 28 51v19z');

export function coinSprite(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const s = size / 100;
  g.scale(s, s);
  g.save();
  g.beginPath();
  g.arc(50, 50, 48, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#f26822';
  g.fillRect(0, 0, 100, 100);
  g.fillStyle = '#4c4c4c';
  g.fillRect(0, 70, 100, 30);
  g.fillStyle = '#fff';
  g.fill(M);
  g.restore();
  g.lineWidth = 3;
  g.strokeStyle = '#b84a12';
  g.beginPath();
  g.arc(50, 50, 48, 0, Math.PI * 2);
  g.stroke();
  return c;
}
