import {
  convertArc,
  convertCircle,
  convertCopperArea,
  convertHole,
  convertLib,
  convertSolidRegion,
  convertTrack
} from './board';
import { encodeObject, ISpectraList } from './spectra';

function removeNulls(a: ISpectraList): ISpectraList {
  return a
    .map((item) => (item instanceof Array ? removeNulls(item) : item))
    .filter((e) => e != null);
}

function round(obj: ISpectraList | string | number, precision = 3): ISpectraList | string | number {
  if (obj instanceof Array) {
    return obj.map((item) => round(item, precision));
  }
  if (typeof obj === 'number') {
    if (obj > -Number.EPSILON && obj < Number.EPSILON) {
      return 0;
    }
    return parseFloat(obj.toFixed(precision));
  }
  return obj;
}

function normalize(obj: ISpectraList) {
  return round(removeNulls(obj));
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

describe('convertPadToVia', () => {
  it('should correctly parse a PAD and convert it to a Via', () => {
    expect(
      convertPadToVia(
        [
          'ELLIPSE',
          '0',
          '0',
          '2.4',
          '2.4',
          '11',
          'VCC3V3',
          '',
          '0.6',
          '',
          '0',
          'gge19',
          '0',
          '',
          'Y',
          '0',
        ],
        []
      )
    ).toEqual([
      'via',
      ['at', 0, 0],
      ['size', 0.61],
      ['drill', 0.305],
      ['layers', 'F.Cu', 'B.Cu'],
      ['net', -1]
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

  it('should correctly determine the arc start and end point (issue #16)', () => {
    const arc = 'ARC~1~1~S$9~M4262.5,3279.5 A33.5596,33.5596 0 0 0 4245.5921,3315.5816~~gge8~0'
      .split('~')
      .slice(1);
    expect(encodeObject(convertArc(arc))).toEqual(
      '(gr_arc (start 70.739 78.486) (end 62.38 80.158) (angle 72.836) (width 0.254) (layer "F.Cu"))'
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
});

describe('convertSolidRegion', () => {
  it('should correctly parse the given SVG path', () => {
    expect(
      convertSolidRegion(
        [
          '2',
          'L3_2',
          'M 4280 3173 L 4280 3127.5 L 4358.5 3128 L 4358.5 3163.625 L 4371.5 3163.625 L 4374.5 3168.625 L 4374.5 3173.125 L 4369 3173.125 L 4358.5 3173.125 L 4358.5 3179.625 L 4406.5 3179.625 L 4459 3179.5 L 4459 3252.5 L 4280.5 3253 L 4280 3173 Z',
          'cutout',
          'gge40',
          '0'
        ],
        ['L3_2']
      )
    ).toEqual([
      'zone',
      ['net', 0],
      ['net_name', ''],
      ['hatch', 'edge', 0.508],
      ['layer', 'B.Cu'],
      ['keepout', ['tracks', 'allowed'], ['vias', 'allowed'], ['copperpour', 'not_allowed']],
      [
        'polygon',
        [
          'pts',
          ['xy', 71.11999999999999, 43.942],
          ['xy', 71.11999999999999, 32.385],
          ['xy', 91.059, 32.512],
          ['xy', 91.059, 41.56075],
          ['xy', 94.36099999999999, 41.56075],
          ['xy', 95.12299999999999, 42.830749999999995],
          ['xy', 95.12299999999999, 43.973749999999995],
          ['xy', 93.726, 43.973749999999995],
          ['xy', 91.059, 43.973749999999995],
          ['xy', 91.059, 45.62475],
          ['xy', 103.25099999999999, 45.62475],
          ['xy', 116.586, 45.592999999999996],
          ['xy', 116.586, 64.13499999999999],
          ['xy', 71.247, 64.262],
          ['xy', 71.11999999999999, 43.942]
        ]
      ]
    ]);
  });

  it('should ignore solid regions with circles (issue #12)', () => {
    expect(
      convertSolidRegion(
        [
          '1',
          '',
          'M 4367 3248 A 33.8 33.8 0 1 0 4366.99 3248 Z ',
          'cutout',
          'gge1953',
          '',
          '',
          '',
          '0'
        ],
        []
      )
    ).toEqual(null);
  });
});

describe('convertHole()', () => {
  it('should convert HOLE into KiCad footprint', () => {
    expect(normalize(convertHole(['4475.5', '3170.5', '2.9528', 'gge1205', '1']))).toEqual([
      'module',
      'AutoGenerated:MountingHole_1.50mm',
      'locked',
      ['layer', 'F.Cu'],
      ['at', 120.777, 43.307],
      ['attr', 'virtual'],
      ['fp_text', 'reference', '', ['at', 0, 0], ['layer', 'F.SilkS']],
      ['fp_text', 'value', '', ['at', 0, 0], ['layer', 'F.SilkS']],
      [
        'pad',
        '',
        'np_thru_hole',
        'circle',
        ['at', 0, 0],
        ['size', 1.5, 1.5],
        ['drill', 1.5],
        ['layers', '*.Cu', '*.Mask']
      ]
    ]);
  });
});

describe('convert circle', () => {
  it('should correctly determine the end point according to radius', () => {
    expect(
      round(convertCircle(['4000', '3000', '12.4', '1', '3', 'gge635', '0', '', '']))
    ).toEqual([
      'gr_circle',
      ['center', 0, 0],
      ['end', 3.15, 0],
      ['layer', 'F.SilkS'],
      ['width', 0.254]
    ]);
  });
});

describe('convertLib()', () => {
  it('should include the footprint name in the exported module', () => {
    expect(
      normalize(
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
      normalize(
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
        ['at', -40.259, 55.372, -90],
        ['size', 1.016, 1.016],
        ['layers', '*.Cu', '*.Paste', '*.Mask'],
        ['drill', 0.762]
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

  it('should correctly orient text inside footprints', () => {
    const text =
      '#@$TEXT~N~4363~3153~0.6~90~~3~~4.5~0.5pF~M 4359.51 3158.63 L 4359.71 3159.25~none~gge188~~0~';
    expect(
      normalize(
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
            ...text.split('~')
          ],
          []
        )
      )
    ).toEqual([
      'module',
      'easyeda:1206',
      ['layer', 'F.Cu'],
      ['at', 57.912, 47.625, -90],
      [
        'fp_text',
        'value',
        '0.5pF',
        ['at', -8.763, -34.29, 90],
        ['layer', 'F.Fab'],
        'hide',
        ['effects', ['font', ['size', 1.143, 1.143], ['thickness', 0.152]], ['justify', 'left']]
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

  it('should correctly convert pad offsets (issue #11)', () => {
    const input =
      'LaIB~4177~3107~package`0402`3DModel`R_0603_1608Metric`~90~~gge464~1~405bb71866794ab59459d3b2854a4d33~1541687137~0~#@$TEXT~P~4173.31~3108.77~0.5~90~0~3~~2.4~R2~M 4172.0001 3108.77 L 4174.2901 3108.77 M 4172.0001 3108.77 L 4172.0001 3107.79 L 4172.1101 3107.46 L 4172.2201 3107.35 L 4172.4401 3107.24 L 4172.6601 3107.24 L 4172.8701 3107.35 L 4172.9801 3107.46 L 4173.0901 3107.79 L 4173.0901 3108.77 M 4173.0901 3108.01 L 4174.2901 3107.24 M 4172.5501 3106.41 L 4172.4401 3106.41 L 4172.2201 3106.3 L 4172.1101 3106.2 L 4172.0001 3105.98 L 4172.0001 3105.54 L 4172.1101 3105.32 L 4172.2201 3105.21 L 4172.4401 3105.1 L 4172.6601 3105.1 L 4172.8701 3105.21 L 4173.2001 3105.43 L 4174.2901 3106.52 L 4174.2901 3105~~gge467~~0~#@$TEXT~N~4160~3102.72~0.5~90~0~3~~4.5~2K2~M 4158.57 3102.52 L 4158.36 3102.52 L 4157.95 3102.31 L 4157.75 3102.11 L 4157.55 3101.7 L 4157.55 3100.88 L 4157.75 3100.47 L 4157.95 3100.27 L 4158.36 3100.06 L 4158.77 3100.06 L 4159.18 3100.27 L 4159.8 3100.67 L 4161.84 3102.72 L 4161.84 3099.86 M 4157.55 3098.51 L 4161.84 3098.51 M 4157.55 3095.64 L 4160.41 3098.51 M 4159.39 3097.48 L 4161.84 3095.64 M 4158.57 3094.09 L 4158.36 3094.09 L 4157.95 3093.88 L 4157.75 3093.68 L 4157.55 3093.27 L 4157.55 3092.45 L 4157.75 3092.04 L 4157.95 3091.84 L 4158.36 3091.63 L 4158.77 3091.63 L 4159.18 3091.84 L 4159.8 3092.25 L 4161.84 3094.29 L 4161.84 3091.43~none~gge468~~0~#@$PAD~RECT~4177~3108.67~2.362~2.559~1~SWCLK~1~0~4175.72 3109.85 4175.72 3107.49 4178.28 3107.49 4178.28 3109.85~90~gge466~0~~Y~0~0~0.4~4177,3108.67#@$SVGNODE~{"gId":"gge464_outline","nodeName":"g","nodeType":1,"layerid":"19","attrs":{"c_width":"6.4","c_height":"3.1898","c_rotation":"0,0,90","z":"0","c_origin":"4177,3107.03","uuid":"14d29194d76d4abda3f419dd15e5ae1e","c_etype":"outline3D","id":"gge464_outline","title":"R_0603_1608Metric","layerid":"19","transform":"scale(10.1587) translate(-3765.8265, -2801.1817)","style":""},"childNodes":[{"gId":"gge464_outline_line0","nodeName":"polyline","nodeType":1,"attrs":{"fill":"none","id":"gge464_outline_line0","c_shapetype":"line","points":"4176.843 3107.345 4177.157 3107.345 4177.157 3107.343 4177.157 3107.341 4177.157 3107.338 4177.157 3107.335 4177.157 3107.331 4177.157 3107.327 4177.157 3107.245 4177.157 3107.241 4177.157 3107.237 4177.157 3107.234 4177.157 3107.231 4177.157 3107.229 4177.157 3107.227 4177.157 3106.833 4177.157 3106.831 4177.157 3106.829 4177.157 3106.826 4177.157 3106.823 4177.157 3106.819 4177.157 3106.815 4177.157 3106.733 4177.157 3106.729 4177.157 3106.725 4177.157 3106.722 4177.157 3106.719 4177.157 3106.717 4177.157 3106.715 4176.843 3106.715 4176.843 3106.717 4176.843 3106.719 4176.843 3106.722 4176.843 3106.725 4176.843 3106.729 4176.843 3106.733 4176.843 3106.815 4176.843 3106.819 4176.843 3106.823 4176.843 3106.826 4176.843 3106.829 4176.843 3106.831 4176.843 3106.833 4176.843 3107.227 4176.843 3107.229 4176.843 3107.231 4176.843 3107.234 4176.843 3107.237 4176.843 3107.241 4176.843 3107.245 4176.843 3107.327 4176.843 3107.331 4176.843 3107.335 4176.843 3107.338 4176.843 3107.341 4176.843 3107.343 4176.843 3107.345 4176.843 3107.345';

    expect(normalize(convertLib(input.split(/~/g).slice(1), ['', '+3V3', 'SWCLK']))).toEqual([
      'module',
      'easyeda:0402',
      ['layer', 'F.Cu'],
      ['at', 44.958, 27.178, 90],
      ['attr', 'smd'],
      [
        'fp_text',
        'reference',
        'R2',
        ['at', -0.45, -0.937, 90],
        ['layer', 'F.SilkS'],
        ['effects', ['font', ['size', 0.61, 0.61], ['thickness', 0.127]], ['justify', 'left']]
      ],
      [
        'fp_text',
        'value',
        '2K2',
        ['at', 1.087, -4.318, 90],
        ['layer', 'F.Fab'],
        'hide',
        ['effects', ['font', ['size', 1.143, 1.143], ['thickness', 0.127]], ['justify', 'left']]
      ],
      [
        'pad',
        1,
        'smd',
        'rect',
        ['at', -0.424, 0, 90],
        ['size', 0.6, 0.65],
        ['layers', 'F.Cu', 'F.Paste', 'F.Mask'],
        ['net', 2, 'SWCLK']
      ],
      [
        'fp_text',
        'user',
        'gge464',
        ['at', 0, 0],
        ['layer', 'Cmts.User'],
        ['effects', ['font', ['size', 1, 1], ['thickness', 0.15]]]
      ]
    ]);
  });

  it('should convert polygons inside footprints (issue #15)', () => {
    const input =
      'LIB~4401~3164~package`IEC_HIGHVOLTAGE_SMALL`~~~gge846~1~~~0~#@$SOLIDREGION~3~~M 4400.3 3160.5 L 4401.8 3160.5 L 4399.1 3165.8 L 4402.9 3164.7 L 4400.9 3169.3 L 4401.7 3169.1 L 4400.1 3170.9 L 4399.8 3168.8 L 4400.3 3169.2 L 4401.3 3165.9 L 4397.6 3167.1 Z ~solid~gge849~~~~0';

    expect(normalize(convertLib(input.split(/~/g).slice(1), ['']))).toEqual([
      'module',
      'easyeda:IEC_HIGHVOLTAGE_SMALL',
      ['layer', 'F.Cu'],
      ['at', 101.854, 41.656],
      [
        'fp_poly',
        [
          'pts',
          ['xy', -0.178, -0.889],
          ['xy', 0.203, -0.889],
          ['xy', -0.483, 0.457],
          ['xy', 0.483, 0.178],
          ['xy', -0.025, 1.346],
          ['xy', 0.178, 1.295],
          ['xy', -0.229, 1.753],
          ['xy', -0.305, 1.219],
          ['xy', -0.178, 1.321],
          ['xy', 0.076, 0.483],
          ['xy', -0.864, 0.787]
        ],
        ['layer', 'F.SilkS'],
        ['width', 0]
      ],
      [
        'fp_text',
        'user',
        'gge846',
        ['at', 0, 0],
        ['layer', 'Cmts.User'],
        ['effects', ['font', ['size', 1, 1], ['thickness', 0.15]]]
      ]
    ]);
  });

  it('should not crash if SOLIDREGION contains an arc (issue #15)', () => {
    const input =
      'LIB~4401~3164~package`IEC_HIGHVOLTAGE_SMALL`~~~gge846~1~~~0~#@$#@$SOLIDREGION~3~~M 4513.5 3294 A 12.125 12.125 0 0 1 4495.5 3294 Z ~solid~gge636~~~~0';

    expect(normalize(convertLib(input.split(/~/g).slice(1), ['']))).toEqual([
      'module',
      'easyeda:IEC_HIGHVOLTAGE_SMALL',
      ['layer', 'F.Cu'],
      ['at', 101.854, 41.656],
      [
        'fp_text',
        'user',
        'gge846',
        ['at', 0, 0],
        ['layer', 'Cmts.User'],
        ['effects', ['font', ['size', 1, 1], ['thickness', 0.15]]]
      ]
    ]);
  });

  it('should not respected the locked attribute (issue #23)', () => {
    const input = 'LIB~4050~3050~package`Test`~~~gge123~1~~~1~';

    expect(normalize(convertLib(input.split(/~/g).slice(1), ['']))).toEqual([
      'module',
      'easyeda:Test',
      'locked',
      ['layer', 'F.Cu'],
      ['at', 12.7, 12.7],
      [
        'fp_text',
        'user',
        'gge123',
        ['at', 0, 0],
        ['layer', 'Cmts.User'],
        ['effects', ['font', ['size', 1, 1], ['thickness', 0.15]]]
      ]
    ]);
  });
});
