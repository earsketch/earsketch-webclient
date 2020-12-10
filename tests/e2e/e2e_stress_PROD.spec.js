beforeAll(() => {
  browser.get('https://earsketch.gatech.edu/earsketch2/');
});

describe('time stretch task', () => {
  xit('should call fitMedia with various tempo', () => {
    let tempo = Math.round(Math.random()*175) + 45; // [45,220]
    let audioClip = 'DUBSTEP_BASS_WOBBLE_001';

    $('#coder').$('h3').click();
    element(by.model('name')).sendKeys('temp');
    $('[ng-click="confirm()"]').click();
    $('#editor').click();
    browser.ignoreSynchronization = true;
    browser.actions()
      .sendKeys(
        protractor.Key.COMMAND, 'a', 
        protractor.Key.NULL, 
        'from earsketch import *\n',
        'init()\n',
        'setTempo(' + tempo + ')\n',
        'fitMedia(' + audioClip + ',1,1,2)\n',
        'finish()')
      .perform();
    $('#run-button').click();
    browser.ignoreSynchronization = false;
    browser.sleep(2000);
  });

  xit('should call fitMedia with various tempo and samples', () => {
    let tempo = Math.round(Math.random()*175) + 45; // [45,220]
    $('#coder').$('h3').click();
    element(by.model('name')).sendKeys('temp');
    $('[ng-click="confirm()"]').click();
    $('#editor').click();
    browser.ignoreSynchronization = true;
    browser.actions()
      .sendKeys(
        protractor.Key.COMMAND, 'a', 
        protractor.Key.NULL, 
        'from earsketch import *\n',
        'init()\n',
        'setTempo(' + tempo + ')\n',
        'for track in range(1,30): fitMedia(selectRandomFile("drum"), track, 1, 50)\n',
        'finish()')
      .perform();
    $('#run-button').click().then(() => {
      expect($('#daw-container').isDisplayed()).toBeTruthy(); // angular digest watcher working
    });
    browser.ignoreSynchronization = false;
    browser.sleep(3000); // manual wait needed to ensure the webservice call
  });

  beforeAll(() => {
    element(by.model('username')).sendKeys('earsketchtesting');
    element(by.model('password')).sendKeys('earsketchtesting');
    $('#not-logged-in .icon-arrow-right').click();
    $('#sidenav-filebrowser').click();
    $('#sidenav-scriptbrowser').click();
  });

  it('should compile stressTest.py', () => {
    $('#script-browser [uib-tooltip="stressTest.py"]').click();
    $('#run-button').click(); 
    expect($('#daw-container').isDisplayed()).toBeTruthy();
  });
});

// afterAll(() => {
//   browser.explore();
// });
