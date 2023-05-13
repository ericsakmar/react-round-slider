import {
    convertRange,
    degreesToRadians, ellipseMovement,
    getV2Angle, getAnglesSub,
    polarToCartesian,
    radiansToDegrees,
    v2Sub,
    Vector2, setDecimalPlaces, isNumber,
} from 'mz-math';
import { isAngleInArc } from './angles-provider';
import { IStatePointer, TData, TStep } from '../interfaces';
import { MAX_VALUE_DEFAULT, MIN_VALUE_DEFAULT } from './defaults';
import { getNumber } from './common';

/**
 * Calculate SVG size depending on ellipse radii and max pointer size.
 */
export const getSVGSize = (svgRadii: Vector2, maxPointerRadii: Vector2, strokeWidth: number) : Vector2 => {

    const [ rxSvg, rySvg ] = svgRadii;
    const [ rxPointer, ryPointer ] = maxPointerRadii;

    const diffX = Math.max(0, rxPointer * 2 - strokeWidth);
    const diffY = Math.max(0, ryPointer * 2 - strokeWidth);

    const svgWidth = rxSvg * 2 + strokeWidth + diffX;
    const svgHeight = rySvg * 2 + strokeWidth + diffY;

    return [
        svgWidth,
        svgHeight,
    ];
};

/**
 * Calculate the center point of the SVG.
 */
export const getSVGCenter = (svgRadii: Vector2, maxPointerRadii: Vector2, strokeWidth: number) : Vector2 => {

    const [ svgWidth, svgHeight ] = getSVGSize(svgRadii, maxPointerRadii, strokeWidth);

    return [
        setDecimalPlaces(svgWidth / 2, 2),
        setDecimalPlaces(svgHeight / 2, 2)
    ];
};

/**
 * Get start & end points of SVG ellipse/circle segment.
 * Also define the 'large-arc-flag' property of svg path data elliptical arc.
 * Elliptical arc: rx ry angle large-arc-flag sweep-flag x y.
 */
export const getEllipseSegment = (
    startAngleDegrees: number,
    endAngleDegrees: number,
    svgRadii: Vector2,
    pointerRadii: Vector2,
    strokeWidth: number
) => {

    let _endAngleDegrees = endAngleDegrees;
    const largeArcFlag = _endAngleDegrees - startAngleDegrees <= 180 ? 0 : 1;

    if(startAngleDegrees > _endAngleDegrees){
        _endAngleDegrees += 360;
    }

    const center = getSVGCenter(svgRadii, pointerRadii, strokeWidth);

    const sliderStartPoint = polarToCartesian(center, svgRadii, degreesToRadians(startAngleDegrees));
    const sliderEndPoint = polarToCartesian(center, svgRadii, degreesToRadians(_endAngleDegrees));

    return {
        sliderStartPoint,
        sliderEndPoint,
        largeArcFlag,
    }
};

/**
 * Define pointer position according to the current user settings and mouse/touch position.
 */
export const getPointerPosition = (
    $svg: SVGSVGElement,
    absoluteMouse: Vector2,
    center: Vector2,
    svgRadii: Vector2,
    startAngleDegrees: number,
    endAngleDegrees: number,
    sliderStartPoint: Vector2,
    sliderEndPoint: Vector2,
) : Vector2 => {
    const [clientX, clientY] = absoluteMouse;

    const { left, top } = $svg.getBoundingClientRect();

    const relativeMouse: Vector2 = [
        clientX - left,
        clientY - top,
    ];

    const vector = v2Sub(relativeMouse, center);

    let angle = getV2Angle(vector);
    if(angle < 0){
        angle += 2 * Math.PI;
    }

    const degrees = radiansToDegrees(angle);
    const angleSub1 = getAnglesSub(degrees, startAngleDegrees);
    const angleSub2 = getAnglesSub(degrees, endAngleDegrees);

    const isInArc = isAngleInArc(startAngleDegrees, endAngleDegrees, degrees);
    if(!isInArc){
        return angleSub1 <= angleSub2 ? sliderStartPoint : sliderEndPoint;
    }

    // Convert the angle from the range [0, Math.PI*2] to the range [0, Math.PI].
    angle = convertRange(angle, 0, Math.PI*2, 0, Math.PI);
    return ellipseMovement(center, angle, svgRadii[0], svgRadii[1]);
};

/**
 * Max pointer [rx, ry] is used to define svg size, svg center position,
 * and also ellipse/circle properties.
 */
export const getMaxPointer = (pointers: IStatePointer[]) : Vector2 => {
    let maxX = -Infinity;
    let maxY = -Infinity;

    for(const pointer of pointers){
        const [rx, ry] =  pointer.pointerRadii;
        maxX = Math.max(maxX, rx);
        maxY = Math.max(maxY, ry);
    }

    return [
        maxX,
        maxY,
    ];
};

/**
 * On component init, min and max should be initialized together,
 * because their validations depend on each other.
 * In case when the data is provided, min & max represent index in the data array.
 */
export const getMinMax = (
    min: number | string | undefined | null,
    max: number | string | undefined | null,
    data?: TData
): Vector2 => {
    if(data !== undefined){

        const minIndex = data.findIndex(item => item === min);
        const maxIndex = data.findIndex(item => item === max);

        let _min = minIndex === -1 ? 0 : minIndex;
        let _max = maxIndex === -1 ? data.length - 1 : maxIndex;
        return [_min, _max];
    }

    let _min = getNumber(min, MIN_VALUE_DEFAULT);
    let _max = getNumber(max, MAX_VALUE_DEFAULT);

    if(_min > _max){
        _max = _min + MAX_VALUE_DEFAULT;
    }

    if(_max < _min){
        _max = _min + MAX_VALUE_DEFAULT;
    }

    return [_min, _max];
};

/**
 * Step is defined in absolute units (not percent!)
 * This function should validate step provided by the user,
 * for example the case when step > all the data range.
 */
export const getStep = (userStep: TStep, min: number, max: number) : TStep => {
    if(userStep === null || userStep === undefined){
        return undefined;
    }

    if (typeof userStep === 'function') {
        return userStep;
    }

    if(isNumber(userStep)){
        let step = getNumber(userStep, 1);

        const diff = Math.abs(max - min);
        if (step > diff) {
            step = undefined;
        }

        return step;
    }

    return undefined;
};
