# node-red-contrib-ambient Node-REDのAmbientノード

## Ambient
[Ambient](https://ambidata.io)はIoTクラウドサービスで、センサーデーターを受信し、蓄積し、可視化(グラフ化)します。

![Ambient structure](https://ambidata.io/wp/wp-content/uploads/2016/09/AmbientStructure.jpg)

Ambientにユーザー登録(無料)し、マイコンからデーターを送ると、こんな感じでグラフ表示させることができます。

![Ambient chart](https://ambidata.io/wp/wp-content/uploads/2016/09/fig3-1024x651.jpg)

node-red-contrib-ambientはAmbientにデーターを送信するNode-REDノードです。

## インストール

Node-REDのルートディレクトリーで次のようにインストールしてください。

```sh
$ npm install node-red-contrib-ambient
```

## 使い方

事前に[Ambient](https://ambidata.io)にユーザー登録(無料)し、チャネルを生成してください。

AmbientノードをNode-REDにインストールすると、パレットの「advanced」カテゴリーにAmbientノードが追加されます。

![Ambient in palette](https://ambidata.io/wp/wp-content/uploads/2016/09/fig2-2-1.jpg)

ノードをワークスペースにドラッグし、ダブルクリックして、データーを送信するAmbientチャネルのチャネルIdとライトキーを設定してください。

![ambient setting](https://ambidata.io/wp/wp-content/uploads/2016/09/fig3-2-1024x651.jpg)

## Ambientへのデーター送信

Ambientには次のようなJSONフォーマットでデーターを送ります。

```javascript
{"d1":データー1, "d2":データー2, "d3":データー3, ...}
```

センサーデーターを上のようなJSONフォーマットにしてmsg.payloadにセットし、Ambientノードに送信してください。

## データーの確認

送信したデーターは[Ambient](https://ambidata.io)サイトで確認することができます。
