window.CONCEPT = {
  wordPictureBase: 'pictures',
  kind: 'silk',
  title: 'Ribbon Road',
  themes: ['Pink', 'Purple', 'Yellow'],
  slug: 'v4-silk-thread',
  assetBase: '../v1-letter-post/assets',
  home: ({ pic, pickers, collection, count = 26 }) => `
    <section class="screen home silk-home">
      <div class="silk-welcome">
        <div class="home-copy">
          <p class="eyebrow">Little Sounds Big Discovery</p>
          <h1>Lucy’s<br><em>Ribbon Road.</em></h1>
          <p class="lead">A little sound.<br>A lovely place to start.</p>
          <div class="beads" aria-hidden="true"><b>A</b><b>B</b><b>C</b><b>D</b><b>E</b><b>F</b></div>
          <button class="primary silk-play" data-action="start"><span class="play-icon" aria-hidden="true">▶</span><span>Play with Lucy<small>Tap to start sound</small></span><span class="cta-spark" aria-hidden="true">✦</span></button>
        </div>
        <div class="lucy-stage">${pic('default', 'Let’s follow the sounds!')}<span class="stage-spark one" aria-hidden="true">✦</span><span class="stage-spark two" aria-hidden="true">✧</span><p class="mascot-caption">YOUR LITTLE LEARNING FRIEND</p></div>
      </div>
      <div class="silk-trail" aria-labelledby="trail-title">
        <div class="trail-heading"><div><p class="eyebrow">OUR LITTLE LETTER ADVENTURE</p><h2 id="trail-title">Follow the sounds.</h2></div><p>Tap a letter. Lucy will come along!<small>${count === 26 ? 'Scroll for all 26 letters ↓' : count === 1 ? 'One letter chosen for today' : `${count} letters chosen for today ↓`}</small></p></div>
        ${pickers('pearls')}
      </div>
      ${collection()}
    </section>`
};
