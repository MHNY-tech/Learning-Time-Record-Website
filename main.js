/* jshint curly:true, debug:true */
/* globals $, firebase */


let currentUID = null;

// 登録モーダル 日付フォームクリックするとカレンダー表示
$('.datepicker').datepicker();

/**
 * ----------------------
 * すべての画面共通で使う関数
 * ----------------------
 */

// ビュー（画面）を変更する
const showView = (id) => {
  $('.view').hide();
  $(`#${id}`).fadeIn();

  if (id === 'time-record') {
    loadRecordView();
  }
};

// Realtime Database の records から学習データを削除する
const deleteRecord = (recordId) => {
  // TODO: records から該当の学習データを削除
  firebase
    .database()
    .ref(`records/${currentUID}/${recordId}`)
    .remove();
};

// 学習データの表示用のdiv（jQueryオブジェクト）を作って返す
const createRecordDiv = (recordId, recordData) => {
  // HTML内のテンプレートからコピーを作成する
  const $divTag = $('#time-record-template .time-record-item').clone();

  // 学習登録（日付・学習時間・学習科目・学習内容）を表示する
  $divTag.find('.record-item__date').text(recordData.recordDate);
  $divTag.find('.record-item__time-text').text(recordData.recordTime);
  $divTag.find('.record-item__subject-text').text(recordData.recordSubject);
  $divTag.find('.record-item__content-text').text(recordData.recordContent);
  // id属性をセット
  $divTag.attr('id', recordId);

  // 削除ボタンのイベントハンドラを登録
  const $deleteButton = $divTag.find('.time-record-item__delete');
  $deleteButton.on('click', () => {
    deleteRecord(recordId, recordData);
  });
  return $divTag;
};

// 学習一覧画面内の学習データをクリア
const resetRecordshelfView = () => {
  $('#record-list').empty();
};

// 学習一覧画面に学習データを表示する
const addRecord = (recordId, recordData) => {
  const $divTag = createRecordDiv(recordId, recordData);
  $divTag.appendTo('#record-list');
};


// 学習一覧画面に学習編集データを表示する
const editRecord = (recordId, recordData) => {
  const $editTarget = $(`#${recordId}`);
  $editTarget.find('.record-item__date').text(recordData.recordDate);
  $editTarget.find('.record-item__time-text').text(recordData.recordTime);
  $editTarget.find('.record-item__subject-text').text(recordData.recordSubject);
  $editTarget.find('.record-item__content-text').text(recordData.recordContent);
};



// 学習一覧画面の初期化、イベントハンドラ登録処理
const loadRecordView = () => {
  resetRecordshelfView();

  // 学習データを取得
  const recordsRef = firebase
    .database()
    .ref(`records/${currentUID}`)
    .orderByChild('createdAt');

  // 過去に登録したイベントハンドラを削除
  recordsRef.off('child_removed');
  recordsRef.off('child_added');


  // records の child_removedイベントハンドラを登録
  // （データベースから学習情報が削除されたときの処理）
  recordsRef.on('child_removed', (recordSnapshot) => {
    const recordId = recordSnapshot.key;
    const $record = $(`#${recordId}`);
    console.log('recordId', recordId);

    // 学習一覧画面から該当の学習データを削除する
    $record.remove();
    getTotal();
  });

  // records の child_addedイベントハンドラを登録
  // （データベースに学習情報が追加保存されたときの処理）
  recordsRef.on('child_added', (recordSnapshot) => {
    const recordId = recordSnapshot.key;
    const recordData = recordSnapshot.val();

    // 学習一覧画面に学習データを表示する
    addRecord(recordId, recordData);
    getTotal();
  });

  // records の child_changedイベントハンドラを登録
  // （データベースに学習情報が追加保存されたときの処理
  recordsRef.on('child_changed', (recordSnapshot) => {
    const recordId = recordSnapshot.key;
    const recordData = recordSnapshot.val();

    editRecord(recordId, recordData);
    getTotal();
  });
};


/**
 * -------------------------
 * ログイン・ログアウト関連の関数
 * -------------------------
 */

// ログインフォームを初期状態に戻す
const resetLoginForm = () => {
  $('#login__help').hide();
  $('#login__submit-button')
    .prop('disabled', false)
    .text('ログイン');
};

// ログインした直後に呼ばれる
const onLogin = () => {
  console.log('ログイン完了');

  // 学習一覧画面を表示
  showView('time-record');
};

// ログアウトした直後に呼ばれる
const onLogout = () => {
  const recordsRef = firebase.database().ref('records');

  // 過去に登録したイベントハンドラを削除
  recordsRef.off('child_removed');
  recordsRef.off('child_added');

  showView('login');
};


/**
 * ------------------
 * イベントハンドラの登録
 * ------------------
 */

// ログイン状態の変化を監視する
firebase.auth().onAuthStateChanged((user) => {
  // ログイン状態が変化した
  if (user) {
    // ログイン済
    currentUID = user.uid;
    onLogin();
  }
  else {
    // 未ログイン
    currentUID = null;
    onLogout();
  }
});

// ログインフォームが送信されたらログインする
$('#login-form').on('submit', (e) => {
  e.preventDefault();

  const $loginButton = $('#login__submit-button');
  $loginButton.text('送信中…');

  const email = $('#login-email').val();
  const password = $('#login-password').val();

  // ログインを試みる
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      // ログインに成功したときの処理
      console.log('ログインしました。');

      // ログインフォームを初期状態に戻す
      resetLoginForm();
    })
    .catch((error) => {
      // ログインに失敗したときの処理
      console.error('ログインエラー', error);

      $('#login__help')
        .text('ログインに失敗しました。')
        .show();

      // ログインボタンを元に戻す
      $loginButton.text('ログイン');
    });
});

// ログアウトボタンが押されたらログアウトする
$('.logout-button').on('click', () => {
  firebase
    .auth()
    .signOut()
    .catch((error) => {
      console.error('ログアウトに失敗:', error);
    });
});


/**
 * -------------------------
 * 学習時間追加モーダル関連の処理
 * -------------------------
 */


const resetAddRecordModal = () => {
  $('#record-form')[0].reset();
  $('#submit_add_record')
    .prop('disabled', false)
    .text('保存する');
};

// 学習時間の登録処理
$('#record-form').on('submit', (e) => {
  e.preventDefault();


  // 学習時間の登録ボタンを押せないようにする
  $('#submit_add_record')
    .prop('disabled', true)
    .text('送信中…');

  // 学習項目（日付・時間・科目・内容）の取得
  const recordDate = $('#add-record-date').val();
  const recordTime = $('#add-record-time').val();
  const recordSubject = $('#add-record-subject').val();
  const recordContent = $('#add-record-content').val();

  const recordData = {
    recordDate,
    recordTime,
    recordSubject,
    recordContent,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  };


  firebase
    .database()
    .ref(`records/${currentUID}`)
    .push(recordData)
    .then(() => {
      // 学習時間一覧画面の書籍の登録モーダルを閉じて、初期状態に戻す
      $('#time-record-modal').modal('hide');
      resetAddRecordModal();
    })
    .catch((error) => {
      // 失敗したとき
      console.error('エラー', error);
      resetAddRecordModal();
      $('#add-record__help')
        .text('保存できませんでした。')
        .fadeIn();
    });
});


/**
 * -------------------------
 * 学習登録編集モーダル関連の処理
 * -------------------------
 */
const resetEditRecordModal = () => {
  $('#record-edit-form')[0].reset();
  $('#submit_edit_record')
    .prop('disabled', false)
    .text('保存する');
};

// 学習時間の登録処理

$('#record-edit-form').on('submit', (e) => {
  e.preventDefault();
  console.log('e.target', e.target);
  const recordId = $(e.target).attr('edit-dt');
  console.log('recordId', recordId);

  // 学習時間の登録ボタンを押せないようにする
  $('#submit_edit_record')
    .prop('disabled', true)
    .text('送信中…');

  // 学習項目（日付・科目・時間・内容）の取得
  const recordDate = $('#add-edit-record-date').val();
  const recordTime = $('#add-edit-record-time').val();
  const recordSubject = $('#add-edit-record-subject').val();
  const recordContent = $('#add-edit-record-content').val();

  const recordData = {
    recordDate,
    recordTime,
    recordSubject,
    recordContent,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  };

  firebase
    .database()
    .ref(`records/${currentUID}/${recordId}`)
    .set(recordData)
    .then(() => {
      // 学習時間一覧画面の書籍の登録モーダルを閉じて、初期状態に戻す
      $('#time-record-edit-modal').modal('hide');
      resetEditRecordModal();
    })
    .catch((error) => {
      // 失敗したとき
      console.error('エラー', error);
      resetEditRecordModal();
      $('#add-edit-record__help')
        .text('保存できませんでした。')
        .fadeIn();
    });

});

// クリックしたとき、学習カードからモーダルのフォームへ情報を反映
$(document).on('click', '.time-record-item__edit', (event) => {
  const $targetCard = $(event.target).closest('.time-record-item');

  // レコードIDを取得する
  const recordId = $targetCard.attr('id');
  console.log('recordId', recordId);

  // 学習内容の項目を取得する
  const studyDate = $targetCard.find('.record-item__date').text();
  const studyTime = $targetCard.find('.record-item__time-text').text();
  const studySubject = $targetCard.find('.record-item__subject-text').text();
  const studyContent = $targetCard.find('.record-item__content-text').text();

  // 編集モーダルのフォームに学習内容を反映する
  $('#add-edit-record-date').val(studyDate);
  $('#add-edit-record-time').val(studyTime);
  $('#add-edit-record-subject').val(studySubject);
  $('#add-edit-record-content').val(studyContent);

  // edit-dt属性を追加し、レコードIDを取得する
  $('#record-edit-form').attr('edit-dt', recordId);
});

/**
 * -------------------------
 * 学習時間の集計関連の関数
 * -------------------------
 */
const getTotal = () => {
  let totalTime = 0;
  firebase
    .database()
    .ref(`records/${currentUID}`)
    .once('value', (snapshot) => {
      const snapshotValue = snapshot.val();

      Object.keys(snapshotValue).forEach((key) => {
        totalTime += Number.parseFloat(snapshotValue[key].recordTime);
      });
      $('.total-time').text(totalTime);
    });
};
 