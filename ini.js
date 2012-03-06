/********************************************************************
INI file class for JavaScript

Copyright (c)2009-2012 Logue <http://logue.be/> All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions 
are met:

* Redistributions of source code must retain the above copyright 
notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright 
notice, this list of conditions and the following disclaimer in the 
documentation and/or other materials provided with the distribution.

* Neither the name of the nor the names of its contributors may be 
used to endorse or promote products derived from this software 
without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS 
FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE 
COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, 
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES 
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) 
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, 
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING 
IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
POSSIBILITY OF SUCH DAMAGE.
*********************************************************************/

// プロトタイプ
Ini.prototype = {
	meta: {
		"@prefix": "<http://purl.org/net/ns/doas#>",
		"@about": "<io.js>", a: ":JavaScript",
		 title: "Ini file class",
		 created: "2009-01-17", release: {revision: "1.2.0", created: "2012-03-06"},
		 author: {name: "Logue", homepage: "<http://logue.be/>"},
		 acknowledgement: {name: "shoji", 'homepage': "<http://shoji.blog1.fc2.com/blog-entry-130.html>" },
		 license: "<http://www.gnu.org/licenses/gpl-3.0.html>"
	},
	initialize: function(file,isUnicode) {
		this.clear();
		this.isUnicode = (isUnicode) ? true : false;
		if(window.ActiveXObject){
			this.fso = new ActiveXObject("Scripting.FileSystemObject"); // FileSystemObjectを作成
			file = file.replace('file:///','').replace(/\//g,'\\').replace(/%20/g,' ');	// FSOはURL形式を理解できない
		}else if (window.Components){
			netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');
			this.LocalFile  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			this.fileStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
			this.ioService  = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
			this.converterStream = Components.classes['@mozilla.org/intl/converter-input-stream;1'].createInstance(Components.interfaces.nsIConverterInputStream);
		}else if(window.runtime.flash.filesystem ){
			this.air = window.runtime.flash.filesystem;
		}else{
			alert("Ini: Not supported browser.");
		}
		this.open(file);
	},

	// openメソッド - Iniファイルの読込
	open: function(filename) {
		this.filename = (filename) ? filename : this.filename;
		var stream;
		if (this.fso){
			if (this.fso.FileExists(filename)){
				stream = this.fso.OpenTextFile(filename, 1, false, this.isUnicode).ReadAll(); // ファイルを開く
				ini = stream.split('\n');
			}else{
				alert("Ini: '" + filename + "' is not found.");
			}
		}else if (window.Components){
			var charset;
			if (this.isUnicode){
				charset = 'utf-16';	// Unicode
			}else{
				charset = 'Shift_JIS';	// ANSI
			}
			this.LocalFile.initWithPath(filename);
			if (this.LocalFile.exists()){
				this.fileStream.init(this.LocalFile, 1, 0, false);
				this.converterStream.init(this.fileStream, charset, this.fileStream.available(),this.converterStream.DEFAULT_REPLACEMENT_CHARACTER);
				var out = {};
				this.converterStream.readString(this.fileStream.available(), out);
				this.converterStream.close();
				this.fileStream.close();
				ini = out.value.split("\n");
			}else{
				alert("Ini: '" + filename + "' is not found.");
			}
		}else if(this.air){
			if( this.air.File.filename.exists){
				var filemode, charset;
				// FSOのエミュレート
				stream = new this.air.FileStream();
				if (this.isUnicode){
					charset = 'utf-16';	// Unicode
				}else{
					charset = this.air.File.systemCharset;	// ANSI
				}
				stream.open(filename, this.air.FileMode.READ);
				stream.readMultiByte(filename.size, encording);
				ini = stream.split(air.File.lineEnding);
				stream.close();
			}else{
				alert("Ini: '" + filename + "' is not found.");
			}
		}
		this.clear();
		
		var section, keyname, value;
	
		// 正規表現マッチパターン（SectionとKeyとValueにマッチ。Sectionとの判定は、4番目に=が含まれてるかで判定）
		var pattern = /^(\[(.*?)\]|(.*?)\s*(=)\s*(.*?))[\.\s]*?$/;

		for(var i = 0; i < ini.length; i++ ){
			if (ini[i] && ini[i] != '\n'){
				var line = ini[i].replace(/^[\s]+/,""); // 先頭の空白は削除
				// 空行ではない
				if( !line.match(/^\s*$/) && !line.match(/^[;\*-\/\/]/) ){
					var args = line.match(pattern);
					if (args){
						args.splice(0,2);
						if (!args[2]){
							section = args[0];
							this.items[ args[0] ] = []; // セクション行を追加
						}
						if(  args[2] === '=' && section !== null ) {
							this.items[ section ][ args[1] ] = args[3];
						}
					}
				}
			}
		}

		this.filename = filename;
		ini = null; delete ini;
	},

	// updateメソッド - iniファイルの更新
	// 改良の余地あり。
	update: function(filename) {
		filename = ( filename == null ) ? this.filename : filename;
		var ini;

		try {
			if (this.fso){
				if (this.fso.FileExists(filename)){
					ini = this.fso.OpenTextFile(this.filename,2,true,this.isUnicode)
					for( var sectionname in this.items ){
						ini.WriteLine( '[' + sectionname + ']' );
						for( var keyname in this.items[sectionname] )
							ini.WriteLine( keyname + '\t=\t' + this.items[sectionname][keyname] );
						ini.WriteLine( '' );
					}
					ini.close();
				}else{
					alert("Ini: '" + filename + "' is not found.");
				}
			}else if(this.air){
				var filemode, encording;
				// FSOのエミュレート
				ini = new this.air.FileStream();
				if (this.isUnicode){
					encording = 'utf-16';
				}else{
					encording = this.air.File.systemCharset;
				}
				if( this.air.File.filename.exists){
					ini.open(filename, this.air.FileMode.WRITE);
					ini.writeMultiByte(filename.size, encording);
					for( var sectionname in this.items ){
						ini.writeMultiByte( '[' + sectionname + ']' );
						for( var keyname in this.items[sectionname] )
							ini.writeMultiByte( keyname + '\t=\t' + this.items[sectionname][keyname] );
						ini.writeMultiByte( '' );
					}
					ini.close();
				}else{
					alert("Ini: '" + filename + "' is not found.");
				}
			}else if(window.Components){
				if (filename.exists()) {
					var ini = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
					ini.init(filename, 2, 0x200, false); // open as "write only"
					for( var sectionname in this.items ){
						ini.push( '[' + sectionname + ']' );
						for( var keyname in this.items[sectionname] ) ini.push(keyname + '\t=\t' + this.items[sectionname][keyname] );
						ini.push( '' );
					}

					var out = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance (Components.interfaces.nsIFileOutputStream);
					out.init (filename, 0x20 | 0x02, 00004, null);
					out.write(tbox.value, tbox.textLength);
					out.close();
				}else{
					alert("Ini: '" + filename + "' is not found.");
				}
			}
			ini = null; delete ini;
		}catch(e){
			console.error(e);
		}
	},

	// clearメソッド - 全削除
	clear: function() {
		try { delete this.items; } catch(e) {}
		this.items = new Array(); // 項目
		this.filename = null; // ファイル名
	},

	// getItemメソッド - 項目の値読み込み
	getItem: function(sectionname, keyname) {
		if( sectionname in this.items )
		if( keyname in this.items[sectionname] )
		return this.items[sectionname][keyname];
	},

	// setItemメソッド - 項目の値設定
	setItem: function(sectionname, keyname, value, updateflag) {
		if( updateflag == null ) updateflag = true;
		if( !(sectionname in this.items) )
		this.items[ sectionname ] = new Array();
		this.items[ sectionname ][ keyname ] = value;
		if( updateflag && this.filename!=null ) this.update();
	}
};

// 各コンストラクタ
function Ini(){
	this.initialize.apply(this,arguments);
}
