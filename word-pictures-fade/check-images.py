#!/usr/bin/env python3
"""Check the actual WebP files against their game sources and fade recipe."""
import hashlib
import json
import numpy as np
from PIL import Image
from generate import ROOT, GAMES, WORDS, PURPLE_SUBJECTS, fade

records=[]
for game, directory in GAMES.items():
    assert len(list((ROOT/game).glob('*.webp'))) == 26
    for word in WORDS:
        source=ROOT.parent/directory/'pictures'/f'{word}.webp'
        output=ROOT/game/f'{word}.webp'
        with Image.open(source) as original, Image.open(output) as result:
            assert original.size == result.size == (512,512), str(output)
            assert result.mode == 'RGBA', str(output)
            actual=np.array(result)
            expected=np.array(fade(original, game=='moonboat', word in PURPLE_SUBJECTS))
            assert np.array_equal(actual,expected), str(output)
            assert np.array_equal(actual[:,:,:3],np.array(original.convert('RGB'))), str(output)
            alpha=actual[:,:,3]
            assert not any(edge.any() for edge in (alpha[0],alpha[-1],alpha[:,0],alpha[:,-1])), str(output)
            assert ((alpha>0)&(alpha<255)).any() and alpha.max()==255, str(output)
        assert output.read_bytes()[12:16] == b'VP8L', str(output)
        records.append(dict(image=f'{game}/{word}.webp',source=str(source.relative_to(ROOT.parent)),sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),outputSha256=hashlib.sha256(output.read_bytes()).hexdigest()))
(ROOT/'checks').mkdir(exist_ok=True)
(ROOT/'checks'/'images.json').write_text(json.dumps(dict(count=len(records),size=[512,512],lossless=True,transparentBorders=True,recipeMatches=True,sourceRgbUnchanged=True,images=records),indent=2)+'\n')
print('52 lossless RGBA WebPs checked: exact recipe, unchanged source RGB, transparent borders, gradual alpha.')
