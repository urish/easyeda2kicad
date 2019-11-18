import { convertArc, convertCopperArea, convertLib, convertTrack } from './board';
import { encodeObject } from './spectra';

function removeNulls(a: string[]) {
  return a.filter((e) => e != null);
}

describe('convertTrack', () => {
  it('should convert copper tracks into segments', () => {
    const result = convertTrack(
      ['0.63', '1', 'GND', '4000 3000 4000 3030', 'gge606', '0'],
      ['', 'GND']
    );
    expect(result.map(removeNulls)).toEqual([
      [
        'segment',
        ['start', 0, 0],
        ['end', 0, 7.62],
        ['width', 0.16002],
        ['layer', 'F.Cu'],
        ['net', 1]
      ]
    ]);
  });

  it(`should throw an error if the given layer number doesn't exist`, () => {
    const fn = () =>
      convertTrack(['0.63', '999', 'GND', '4000 3000 4000 3030', 'gge606', '0'], ['', 'GND']);
    expect(fn).toThrow('Missing layer id: 999');
  });

  it('should convert non-copper layer tracks into gr_lines', () => {
    const result = convertTrack(['0.63', '10', 'GND', '4000 3000 4000 3030', 'gge606', '0'], ['']);
    expect(result.map(removeNulls)).toEqual([
      ['gr_line', ['start', 0, 0], ['end', 0, 7.62], ['width', 0.16002], ['layer', 'Edge.Cuts']]
    ]);
  });
});

describe('convertArc', () => {
  it('should convert arcs', () => {
    expect(
      encodeObject(
        convertArc(['1', '10', '', 'M4050,3060 A10,10 0 0 1 4060,3050', '', 'gge276', '0'])
      )
    ).toEqual(
      '(gr_arc (start 15.24 15.24) (end 12.7 15.24) (angle 90) (width 0.254) (layer "Edge.Cuts"))'
    );
  });

  it('should parse different path formats', () => {
    expect(
      convertArc(['1', '10', '', 'M4000 3000A10 10 0 0 1 4050 3050', '', 'gge170', '0'])
    ).toEqual([
      'gr_arc',
      ['start', 6.35, 6.35],
      ['end', 0, 0],
      ['angle', 180],
      ['width', 0.254],
      ['layer', 'Edge.Cuts']
    ]);
  });

  it('should support negative numbers in arc path', () => {
    expect(
      encodeObject(
        convertArc([
          '0.6',
          '4',
          '',
          'M 3977.3789 3026.2151 A 28.4253 28.4253 -150 1 1 3977.6376 3026.643',
          '',
          'gge66',
          '0'
        ])
      )
    ).toEqual(
      '(gr_arc (start 0.465 2.978) (end -5.746 6.659) (angle 358.992) (width 0.152) (layer "B.SilkS"))'
    );
  });
});

describe('convertCopperArea', () => {
  it('should correctly parse the given SVG path', () => {
    expect(
      convertCopperArea(
        [
          '1',
          '2',
          'GND',
          'M 4050 3050 L 4164 3050 L 4160 3120 L4050,3100 Z',
          '1',
          'solid',
          'gge221',
          'spoke',
          'none',
          '',
          '0',
          '',
          '2',
          '1',
          '1',
          '0',
          'yes'
        ],
        []
      )
    ).toEqual([
      'zone',
      ['net', -1],
      ['net_name', 'GND'],
      ['layer', 'B.Cu'],
      ['hatch', 'edge', 0.508],
      ['connect_pads', ['clearance', 0.254]],
      [
        'polygon',
        ['pts', ['xy', 12.7, 12.7], ['xy', 41.656, 12.7], ['xy', 40.64, 30.48], ['xy', 12.7, 25.4]]
      ]
    ]);
  });

  describe('convertLib()', () => {
    it('should include the footprint name in the exported module', () => {
      expect(
        convertLib(
          [
            '4228',
            '3187.5',
            'package`1206`',
            '270',
            '',
            'gge12',
            '2',
            'a8f323e85d754372811837f27f204a01',
            '1564555550',
            '0'
          ],
          []
        )
      ).toEqual([
        'module',
        'easyeda:1206',
        ['layer', 'F.Cu'],
        ['at', 57.912, 47.625, -90],
        [
          'fp_text',
          'user',
          'gge12',
          ['at', 0, 0],
          ['layer', 'Cmts.User'],
          ['effects', ['font', ['size', 1, 1], ['thickness', 0.15]]]
        ]
      ]);
    });

    it('should correctly orient footprint elements', () => {
      const pad =
        '#@$PAD~ELLIPSE~4010~3029~4~4~11~SEG1C~4~1.5~~270~gge181~0~~Y~0~0~0.4~4010.05,3029.95';
      expect(
        convertLib(
          [
            '4228',
            '3187.5',
            'package`1206`',
            '270',
            '',
            'gge12',
            '2',
            'a8f323e85d754372811837f27f204a01',
            '1564555550',
            '0',
            ...pad.split('~')
          ],
          []
        )
      ).toEqual([
        'module',
        'easyeda:1206',
        ['layer', 'F.Cu'],
        ['at', 57.912, 47.625, -90],
        [
          'pad',
          4,
          'thru_hole',
          'circle',
          ['at', 40.259, 55.372, 180],
          ['size', 1.016, 1.016],
          ['layers', '*.Cu', '*.Paste', '*.Mask'],
          ['drill', 0.762],
          null
        ],
        [
          'fp_text',
          'user',
          'gge12',
          ['at', 0, 0],
          ['layer', 'Cmts.User'],
          ['effects', ['font', ['size', 1, 1], ['thickness', 0.15]]]
        ]
      ]);
    });
  });
});
