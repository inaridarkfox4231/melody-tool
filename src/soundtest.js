// soundtest.

// とりあえずやってみるか。やらないと始まらん。
// いいかんじね。
// いいかんじだわ。
// あーーーーーーーーーーーー。
// 根性で復元した。

// DELAY_COUNTはとりあえず固定で。
// intervalとunitTimeは曲ごとにいじれるように。
// Noteのプロパティ・・
// attackLevelとreleaseLevelはデフォルトを固定して直接いじれるように
// 残り4つについても同様
// ratioと長さはきちんと分ける。
// 振動数。

// MusicではなくTrackにしてenvとoscを備え付ける。

// Noiseとそれ以外はfreqがあるかないか以外すべて同じなので特に分ける必要はないかも。
// 同じメソッドで書いて、Noteがfreqを持つならoscのfreqを変える、でいいと思う。
// NoteはTrackからその、サイン波だとかの情報を受け取ってdrawメソッドで然るべき位置に・・できるのかな。

// Music:いくつかのTrack.
// Track:Noteの配列をもっていてそれを演奏する。oscとenvのペアである「envelopedOscillator」を持っている。
// Note:最小単位。これが演奏に使われる。ADSRとかは個別に変更もできるが生成するときはTrackのデフォルト値を使う。生成時の最低限の要素は振動数と長さ。
// 長さは自由に決められるが一応4tを基準として、その1/2, 1/4, 1/8, 1, 2, 4倍かなぁ。
// 符点も欲しい。それぞれの1.5倍。つまり、3/4とかそういうの。んー。・・それ以外も、できるよねぇ？
// 1/8, 1/4, 1/2, 1, 2, 4, 3/16, 3/8, 3/4, 3/2, 3, 6とかそんな感じ。

let mySystem;

const ADD = 0;
const PLAY = 1;
const DELETE = 2;
const EDIT = 3;
const MODE_NAMES = ["add", "play", "delete", "edit"];

const DEFAULT_INTERVAL = 6; // INTERVAL/60秒に1回。
const DEFAULT_ATTACK_LEVEL = 1.0;
const DEFAULT_RELEASE_LEVEL = 0.0;

// ADSRの初期値。
const DEFAULT_ATTACK_TIME_RATIO = 0.05;
const DEFAULT_DECAY_TIME_RATIO = 0.95;
const DEFAULT_SUSPERCENT = 0.0;
const DEFAULT_RELEASE_TIME_RATIO = 0.0;

const DEFAULT_UNIT_SPAN = 2; // 長さの基本単位(1, 2, 4).

// 振動数配列（0～43で24が440Hzになるように設定）
let CODE_ARRAY = [];
for(let i = 0; i < 44; i++){ CODE_ARRAY.push(i); }
const FREQ_ARRAY = Array.from(CODE_ARRAY, x => 110 * Math.pow(2, x / 12));

// 24が440Hzのラになり、ドレミファソラシドは15, 17, 19, 20, 22, 24, 26, 27になる。
// マウスのスクロールで0～48を表示、ドレミも動く、でひとつひとつは横24の縦20で
// どーんと20x12で縦にずらーっと44個、あと下の方にノイズ用に8つまで。そんな感じで。

// まずクリックするとその位置にあれが・・で、4分割までできる・・デフォルトは1だけど1と1/2と1/4のモードを用意する。
// 長さは伸ばせるけど他のノートと被らないとこまでしか伸ばせなくする（消えないようにする）。消すのはクリックで。

// Add mode.
// クリックすると1, 1/2, 1/4に応じた位置が決まりそこからマウス位置まで線が伸びるのでそれにより長さ、押した場所により音の高さが決まる感じ。
// ノイズかどうかで位置が変わるけど。同時には編集できないようにはする。
// いくつかNoteがある場合の挙動について、クリック位置がNoteの範囲（sustainから計算）と被る場合にはそれを消す、そしてそれのあった位置に新しくNoteを作る、
// そうでなければ挿入モードになる。次のNoteがある場合はその直前までしか伸ばせないようにする。
// Delete mode.
// マウスダウンしてる間、被った位置のNoteをすべて消す。
// Edit mode.
// 音の高さ、長さ、envelope ratio, volumeなどを自由に変えられる。長さはとりあえず1/4刻みで。
// Play mode.
// 演奏開始。そのうち小節単位でどこからどこまでとか指定できるように・・
// 他のモードにすることで強制的にリセットできるようにする。しない場合は最後まで行く。
// まずはAddとPlayだけ作りたいわね。

// if(this.freq)って書いたら0のときfalseになっちゃうでしょ・・馬鹿・・（前にもやらかした）
// とりあえず動く。とりあえずこれで。んー。

function setup(){
	createCanvas(800, 640); // 800 = 128 + 672. 128 = 103 + 25.
	mySystem = new System();

	textSize(32);
	textAlign(CENTER, CENTER);
}

function draw(){
	mySystem.update();
  mySystem.draw();
	mySystem.play();
}

function mousePressed(){
	// マウス位置がコンフィグならモード変更や操作するトラックの変更、再生や停止を行う。
	// マウス位置がノートボードならノートの追加と削除を行う。
	if(0 < mouseX && mouseX < 103 && 0 < mouseY && mouseY < 640){
		controlConfig(mouseX, mouseY);
	}
	// 以下はモードがPLAYのときは反応しないようにする。
	const currentMode = mySystem.config.getMode();
	if(currentMode === PLAY){ return; }
	if(128 < mouseX && mouseX < 800 && 16 < mouseY && mouseY < 640){
		switch(currentMode){
			case ADD:
				prepareForAddNote(mouseX - 128, mouseY - 16); // offSet.
				break;
		}
	}
}

function mouseReleased(){
	//console.log(mySystem.nextNoteData);
	// ノートボードでリリースされた場合だけいろいろやる。
	const currentMode = mySystem.config.getMode();
	if(currentMode === PLAY){ return; }
	if(128 < mouseX && mouseX < 800 && 16 < mouseY && mouseY < 640){
		switch(currentMode){
			case ADD:
				mySystem.addNewNote(); // offSet.
				break;
		}
	}
}

function controlConfig(x, y){
	if(10 < x && x < 70 && 10 < y && y < 160){
		controlMode(y - 10);
	}
	if(10 < x && x < 70 && 170 < y && y < 200){
		// ウィンドウが開いてそこでintervalやunitSpanを変えたりデフォルトのADSRを変えたりレベルを変えたりできるようにする
		// もうちょっと待ってね。
	}
	// あとはトラックの追加、削除など。editingTrackを変更するとか。
}

function controlMode(y){
	if((y % 40) > 30){ return; }
	const mode = Math.floor(y / 40); // 0, 1, 2, 3.
	mySystem.setMode(mode);
	// modeがPLAYならPLAYにする処理、そうでないなら再生を止める処理。
	if(mode !== PLAY){ mySystem.stop(); mySystem.reset(); }
}

// Noteの追加準備
// ここら辺グローバルにするのおかしいだろ
function prepareForAddNote(x, y){
	// 横幅は20だけど最大で1/4まで削れるようにする感じで。24にして8分割できた方がいいのか・・んー。どうしよかな。
	// そうね。24にして7つにしますか。1/8まで指定できるようにしましょう。使うかどうか知らないけど。で、ボタンエリアちょい縮小して。おけおけ。
  let t = mySystem.editingTrack;
	// ノイズかどうかで分けてね
	if(t.isNoise && y < 528){ return; }
	if(!t.isNoise && y > 528){ return; }
	let data = mySystem.nextNoteData;
	data.left = Math.floor(x / (6 * mySystem.unitSpan)) * mySystem.unitSpan;
	data.right = data.left + mySystem.unitSpan; // 右はSpan単位で。
	//console.log(data.left, data.right);
	// 最小単位ができたのでその上で被ったものを排除する感じ。
	if(t.noteArray.length === 0){
		data.index = 0;
	}else{
		// 被ってるものを排除する。
		for(let k = t.noteArray.length - 1; k >= 0; k--){
			let _note = t.noteArray[k];
			if(_note.right > data.left && data.right > _note.left){ t.removeNote(k); }
		}
		// その上で左にあるものの個数。
		data.index = 0;
		for(let k = 0; k < t.noteArray.length; k++){
			if(t.noteArray[k].right <= data.left){ data.index++; }
		}
	}
	// 深さ。0～43の場合は43から引いて振動数に変換する。44以上ならノイズ枠なので・・この数字はブロックを出現させるのに使う。
	// ブロックの左端は128+left*6で上端は16+depth*12で長さは(right-left)*6って感じになる。rightの変化幅はunitSpanですね。
	data.depth = Math.floor(y / 12);
	// 音を鳴らす。
  // やめた。自前で用意する。できた。初めからこうすれば・・・・まあいいや。
	const _type = t.envOsc.getType();
	if(data.depth < 44){ mySystem.tester[_type].freq(FREQ_ARRAY[43 - data.depth]); }
	mySystem.tester[_type].start();
}

class BaseBoard{
	constructor(){
		this.board = createGraphics(672, 624);
		this.initialize();
	}
	initialize(){
		let gr = this.board;
		// 太い線は4つずつと3つずつを切り替えられるようにしたいかも。
		// つまり、4が8つだと具合が悪いので・・6つにする。で、24にして、
		// #だけ160にして#でない音が目立つようにする。12で割った余りが1, 4, 6, 9, 11のとき。
		// できた。
		for(let k = 0; k < 44; k++){
			if([1, 4, 6, 9, 11].includes(k % 12)){ gr.fill(160); }else{ gr.fill(200); }
			gr.rect(0, (43 - k) * 12, 672, 12);
		}
	  gr.fill(120);
	  gr.noStroke();
	  gr.rect(0, 12 * 44, 672, 12 * 8);
  	gr.stroke(255);
	  gr.strokeWeight(1.0);
	  for(let i = 0; i <= 52; i++){
		  gr.line(0, i * 12, 672, i * 12);
	  }
	  gr.strokeWeight(1.0);
	  for(let k = 0; k <= 28; k++){
		  gr.line(k * 24, 0, k * 24, 12 * 52);
	  }
	  gr.strokeWeight(3.0);
	  for(let k = 0; k <= 7; k++){
		  gr.line(k * 96, 0, k * 96, 12 * 52);
	  }
	}
	draw(){
		image(this.board, 128, 16);
	}
}

class NoteBoard{
	constructor(){
		this.board = createGraphics(672, 624);
	}
	update(noteArray){
		// noteを描画
		this.board.clear();
		this.board.fill(0, 128, 255);
		this.board.stroke(64);
		for(let k = 0; k < noteArray.length; k++){
			const _note = noteArray[k];
			const x = _note.left * 6;
			const y = 12 * (_note.freq !== undefined ? 43 - _note.freq : 44);
			const w = 6 * (_note.right - _note.left);
			this.board.rect(x, y, w, 12);
		}
	}
	draw(){
		image(this.board, 128, 16);
	}
}

class ConfigBoard{
	constructor(){
		this.board = createGraphics(128, 640);
		this.cover = createGraphics(128, 640); // ボタン部分は独立させて操作の際にアップデートする。
		this.mode = ADD;
		this.initialize();
		this.updateCover();
	}
	getMode(){
		return this.mode;
	}
	setMode(mode){
		this.mode = mode;
		this.updateCover();
	}
	initialize(){
		let gr = this.board;
	  gr.noStroke();
	  gr.fill(220);
	  gr.rect(0, 0, 128, 640);
	  gr.textSize(12);
	  gr.fill(0);
	  gr.textAlign(LEFT, TOP);
	  let keyArray = ["A2", "A2#", "B2", "C2", "C2#", "D2", "D2#", "E2", "F2", "F2#", "G2", "G2#",
									  "A3", "A3#", "B3", "C3", "C3#", "D3", "D3#", "E3", "F3", "F3#", "G3", "G3#",
								    "A4", "A4#", "B4", "C4", "C4#", "D4", "D4#", "E4", "F4", "F4#", "G4", "G4#",
								    "A5", "A5#", "B5", "C5", "C5#", "D5", "D5#", "E5"];
	  keyArray.reverse();
	  for(let k = 0; k < 44; k++){
		  gr.text(keyArray[k], 103, 16 + 12 * k);
	  }
	}
	updateCover(){
		this.cover.clear();
		for(let k = 0; k < 4; k++){
			if(this.mode === k){
				this.cover.fill(color("forestgreen"));
			}else{
				this.cover.fill(color("palegreen"));
			}
			this.cover.rect(10, 10 + k * 40, 60, 30);
			this.cover.fill(0);
			this.cover.textAlign(CENTER, CENTER);
			this.cover.textSize(18);
			this.cover.text(MODE_NAMES[k], 40, 25 + k * 40);
		}
	}
	draw(){
		image(this.board, 0, 0);
		image(this.cover, 0, 0);
	}
}

class Music{
	constructor(){
		this.trackArray = []; // ほんとはオブジェクトにして名前で管理して排除しやすくした方がいいと思う
		this.properFrameCount = 0;
	}
	addTrack(newTrack){
		this.trackArray.push(newTrack);
	}
	play(){
		if(this.trackArray.length === 0){ return; }
		for(let t of this.trackArray){ t.playNote(this.properFrameCount); }
		this.properFrameCount++;
	}
	drawProgressLine(interval){
		stroke(255, 0, 0);
		line(128 + 6 * this.properFrameCount / interval, 16, 128 + 6 * this.properFrameCount / interval, 640);
	}
	reset(){
		this.properFrameCount = 0;
		for(let t of this.trackArray){ t.reset(); }
	}
}

// 全体
class System{
	constructor(){
		this.base = new BaseBoard();
		this.noteVisual = new NoteBoard();
		this.config = new ConfigBoard();
		this.myMusic = new Music(); // Systemに持たせる感じで。
		this.isPlaying = false; // PLAYかどうかくらいならいいでしょ。
		this.unitSpan = DEFAULT_UNIT_SPAN; // 基本は4つ分で。1,2,4から選べるように。
		this.editingTrack = undefined; // 編集中のトラック。トラックを追加するときにundefinedの場合最初のが登録される、あとは・・変えられるように。
		this.interval = DEFAULT_INTERVAL;

		this.createTestOscillatorSet();

		let track2 = new Track(this.interval);
		let envOsc2 = new EnvelopedOscillator("square"); // オシレータベースじゃないやつも作りたいねぇ。wavファイルベースの。
		track2.setEnvOsc(envOsc2);
		this.myMusic.addTrack(track2); // 追加する機構は後で作る。

		let track3 = new Track(this.interval);
		let envOsc3 = new EnvelopedOscillator("white");
		track3.setEnvOsc(envOsc3);

		this.editingTrack = track2; // こうしないと話が進まないので。
		this.nextNoteData = {}; // 新しいNoteを作る際のデータの格納庫。indexとleftとfreqはこのときに決まる（freqはundefinedの場合もある）。
		// マウス移動によりrightが決まり、startとsustainとして登録される感じ。

	}
	createTestOscillatorSet(){
		this.tester = {};
		this.tester.sine = new p5.Oscillator("sine");
		this.tester.triangle = new p5.Oscillator("triangle");
		this.tester.square = new p5.Oscillator("square");
		this.tester.sawtooth = new p5.Oscillator("sawtooth");
		this.tester.pink = new p5.Noise("pink");
		this.tester.brown = new p5.Noise("brown");
		this.tester.white = new p5.Noise("white");
	}
	setMode(mode){
		if(mode === PLAY && this.config.getMode() !== PLAY){ this.start(); } // 「PLAYでない→PLAY」のときだけ再生する。
		this.config.setMode(mode);
	}
	setInterval(newInterval){
		// 容易には書けないかな・・すべてのTrackのintervalとunitTimeとさらにNoteのunitTimeも全部書き換え。Trackごとにやればいいので落ち着いて実装する。
	}
	setUnitSpan(){
		// 4→2→1→4. こっちはまあ、楽。
		switch(this.unitSpan){
			case 4: this.unitSpan = 2; break;
			case 2: this.unitSpan = 1; break;
			case 1: this.unitSpan = 4; break;
		}
	}
	start(){
		this.isPlaying = true;
	}
	stop(){
		this.isPlaying = false;
	}
	reset(){
		this.myMusic.reset();
	}
	update(){
		if(this.isPlaying){ return; }
		// isPlayingがfalseのときだけ編集可能にする。そこんとこ注意。
		if(mouseIsPressed && this.nextNoteData.left !== undefined){
			this.setRight();
		}
	}
	addNewNote(){
		if(this.nextNoteData.left === undefined){ return; }
		let data = this.nextNoteData;
		let freq = (data.depth < 44 ? 43 - data.depth : undefined);
		let t = this.editingTrack;
		t.addNote(data.index, data.left, data.right - data.left, freq);
		this.noteVisual.update(t.noteArray);
		this.nextNoteData = {}; // data = {}ってやるとエラーになる（this.nextNoteDataの中身は変化しない）ので注意！

		const _type = t.envOsc.getType();
		this.tester[_type].stop();

		// Noteを追加するたびに、myMusicにどこまで増やしていいのかを伝える。あらゆるNoteにおけるrightの最大値を取って
		// intervalを掛ければproperFrameCountの上限が出るのでそれ+1でもって上限としそこでproperFrameCountの増加をやめる。
		// 先にNoteを追加するか。
	}
	draw(){
		clear();
		this.base.draw();
		this.noteVisual.draw();
		this.config.draw();
		// PLAYMODEのとき赤い線を走らせる。あんま余計な事したくないですね。
		if(mouseIsPressed && this.nextNoteData.left !== undefined){
			this.drawBlock();
		}
		if(this.isPlaying){
			this.myMusic.drawProgressLine(this.interval);
		}
	}
	setRight(){
	  let t = this.editingTrack;
		let data = this.nextNoteData;
		let x = constrain(mouseX - 128, 6 * data.left, 672);
		data.right = this.unitSpan + Math.floor(x / (6 * this.unitSpan)) * this.unitSpan;
		// 左にあるものを排除する。
		for(let k = t.noteArray.length - 1; k >= 0; k--){
			let _note = t.noteArray[k];
			if(_note.right > data.left && data.right > _note.left){
				t.removeNote(k);
				this.noteVisual.update(t.noteArray); // リムーブしたら再描画
			}
		}
	}
	drawBlock(){
		const data = this.nextNoteData;
		fill(0, 128, 255);
		stroke(0);
		rect(128 + 6 * data.left, 16 + 12 * data.depth, 6 * (data.right - data.left), 12);
	}
	play(){
		if(this.isPlaying){ this.myMusic.play(); }
	}
}

// いろいろ詳しく知ってからでないと難しいね・・。
class EnvelopedOscillator{
	constructor(typeName){
		this.env = new p5.Envelope();
		this.typeName = typeName;
		switch(typeName){
			case "sine":
		  case "triangle":
			case "square":
			case "sawtooth":
			  this.osc = new p5.Oscillator(typeName);
				break;
			case "brown":
			case "pink":
			case "white":
			  this.osc = new p5.Noise(typeName);
				break;
		}
	}
	getType(){
		return this.typeName;
	}
	setADSR(a, d, s, r){
		this.env.setADSR(a, d, s, r);
	}
	setRange(a, r){
		this.env.setRange(a, r);
	}
	start(){
		this.osc.start();
	}
	stop(){
		this.osc.stop();
	}
	freq(newFreq){
		this.osc.freq(newFreq);
	}
	play(){
		this.env.play(this.osc);
	}
}

class SoundParameter{
	constructor(){
		this.attackLevel = DEFAULT_ATTACK_LEVEL;
		this.releaseLevel = DEFAULT_RELEASE_LEVEL;
		this.attackTimeRatio = DEFAULT_ATTACK_TIME_RATIO;
		this.decayTimeRatio = DEFAULT_DECAY_TIME_RATIO;
		this.susPercent = DEFAULT_SUSPERCENT;
		this.releaseTimeRatio = DEFAULT_RELEASE_TIME_RATIO;
	}
	setRange(a, r){
		this.attackLevel = a;
		this.releaseLevel = r;
	}
	setADSR(aR, dR, s, rR){
		this.attackTimeRatio = aR;
		this.decayTimeRatio = dR;
		this.susPercent = s;
		this.releaseTimeRatio = rR;
	}
	copy(){
		let newParam = new SoundParameter();
		newParam.setRange(this.attackLevel, this.releaseLevel);
		newParam.setADSR(this.attackTimeRatio, this.decayTimeRatio, this.susPercent, this.releaseTimeRatio);
		return newParam;
	}
}

// Noteをクラス化する
// Trackに設定されたADSRとARが登録されるが個別の変更も可能。コンストラクタとしては振動数と長さだけ与える感じ。

// やめよ。さっさとベータ版作ろう。
class Note{
	constructor(start, sustain, freq = undefined){
		this.start = start;
		this.sustain = sustain;
		this.freq = freq;
		this.left = start; // 左端
		this.right = start + sustain; // 右端。sustainは変わってもこっちは不変・・？わかんね。
	}
	changeFreq(newFreq){
		this.freq = newFreq;
	}
	changeSustain(newSustain){
		this.sustain = newSustain;
	}
	changeUnitTime(newUnitTime){
		this.unitTime = newUnitTime;
	}
	changeParam(newParam){
		this.param = newParam.copy();
	}
	setParent(_track, _envOsc){
		this.track = _track;
		this.envOsc = _envOsc;
		this.unitTime = _track.unitTime;
		this.param = _track.param.copy();
	}
	play(){
		const {attackTimeRatio:aR, decayTimeRatio:dR, susPercent:s, releaseTimeRatio:rR} = this.param;
		this.envOsc.setRange(this.param.attackLevel, this.param.releaseLevel);
		this.envOsc.setADSR(aR * this.sustain * this.unitTime, dR * this.sustain * this.unitTime,
		            s, rR * this.sustain * this.unitTime);
	  if(this.freq !== undefined){ this.envOsc.freq(FREQ_ARRAY[this.freq]); } // だから0ベースはやめろとあれほど（以下略）
		this.envOsc.play();
	}
}

class Track{
	constructor(interval, unitTime){
		this.noteArray = [];
		this.interval = interval;
		this.unitTime = interval / 60;
		this.currentNoteCount = 0;
		this.param = new SoundParameter();
		this.isNoise = false;
	}
	setDelayCount(newDelayCount){
		this.delayCount = newDelayCount;
	}
	setEnvOsc(envOsc){
		this.envOsc = envOsc; // envelopedOscillatorを作ってセットする感じ。
		if(["white", "brown", "pink"].includes(envOsc.typeName)){ this.isNoise = true; }
	}
	addNote(index, start, sustain, freq = undefined){
		// 何番目に追加するかっていうのをね。indexで指定するだね。
		let _note = new Note(start, sustain, freq);
		_note.setParent(this, this.envOsc);
		this.noteArray.splice(index, -1, _note); // こうするとindex番目が新しいNoteになる感じ。
	}
	removeNote(index){
		// indexを探し当てるところもメソッド化する必要がありそうな。
		this.noteArray.splice(index, 1);
	}
	playNote(count){
		// countはmusicから渡されるproperFrameCountの値。
		if(this.currentNoteCount === this.noteArray.length){ return; }
		const _note = this.noteArray[this.currentNoteCount];
		if(count === _note.start * this.interval){
			if(this.currentNoteCount === 0){ this.envOsc.start(); } // オシレーターのスイッチはここで入れる感じ。
			_note.play();
			this.currentNoteCount++;
		}
	}
	reset(){
		this.currentNoteCount = 0;
		this.envOsc.stop();
	}
}

/*
	// すきまの16で小節番号を表示する感じ
	base = new BaseBoard(); // 624は12×52で44と8にわけて。背景色変えて。メロディとノイズと。灰色の濃さで分けて。
	noteGr = createGraphics(720, 624); // データに基づいてノートを表示、毎回正方形を描くのではなくそのときの表示位置に応じて書き直す、
	// 横スクロールのたびに再描画する感じ。基本クリア。編集中でないノートは薄く表示させる感じ。透明度で分ける。編集中は色濃く。
	// ノートにはポジションを持たせてそれを使ってトラックから弾いたり逆に登録したりする感じ。
	config = createGraphics(80, 640);
	noteGr.clear();
	createConfig();

  tulip = new Music([15, 17, 19, 15, 17, 19, 22, 19, 17, 15, 17, 19, 17,
										 15, 15, 17, 17, 19, 15, 15, 17, 17, 19, 22, 19, 17, 15, 17, 19, 15,
										 22, 22, 19, 22, 24, 24, 22, 19, 19, 17, 17, 15],
										[0, 4, 8, 16, 20, 24, 32, 36, 40, 44, 48, 52, 56,
										 64, 66, 68, 70, 72, 80, 82, 84, 86, 88, 96, 100, 104, 108, 112, 116, 120,
										 128, 132, 136, 140, 144, 148, 152, 160, 164, 168, 172, 176],
										[4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
										 2, 2, 2, 2, 4, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 4,
										 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
*/
/*
	prepareDefaultMusic(){
	  let envOsc0 = new EnvelopedOscillator("square");
	  let envOsc1 = new EnvelopedOscillator("white");

	  let track0 = new Track();
	  track0.setEnvOsc(envOsc0);
    this.myMusic.addTrack(track0);
	  track0.addNote(0, 0, 1.5, 15);
	  track0.addNote(1, 2, 1.5, 17); // この辺が12フレームで、
	  track0.addNote(2, 4, 1.5, 19);
	  track0.addNote(3, 6, 1.5, 20);
	  track0.addNote(4, 8, 3, 22); // この辺が24フレーム。
	  track0.addNote(5, 12, 3, 22);
	  track0.addNote(6, 16, 1.5, 24);
	  track0.addNote(7, 18, 1.5, 20);
	  track0.addNote(8, 20, 1.5, 27);
	  track0.addNote(9, 22, 1.5, 24);
	  track0.addNote(10, 24, 4.5, 22);
	  track0.addNote(11, 32, 1.5, 24);
	  track0.addNote(12, 34, 1.5, 20);
	  track0.addNote(13, 36, 1.5, 27);
	  track0.addNote(14, 38, 1.5, 24);
	  track0.addNote(15, 40, 4.5, 22);

    let track1 = new Track();
	  track1.setEnvOsc(envOsc1);
	  this.myMusic.addTrack(track1);
	  track1.addNote(0, 0, 1.5);
	  track1.addNote(1, 2, 1.5);
	  track1.addNote(2, 4, 1.5);
	  track1.addNote(3, 6, 1.5);
	  track1.addNote(4, 8, 3);
	  track1.addNote(5, 12, 3);
	}
*/
