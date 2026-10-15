import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,parseMergedCSV} from './csv.js';
test('CSV quoted values, CRLF and blank lines',()=>{
 const rows=parseCSV('B,"A, signal","He said ""yes"""\r\n3200,1,2\r\n\r\n3201,3,4\r\n');
 assert.deepEqual(rows,[['B','A, signal','He said "yes"'],['3200','1','2'],['3201','3','4']]);
});
test('B plus spectrum columns preserve missing amplitudes',()=>{
 const curves=parseMergedCSV('B,Before,After\n3200,1,2\n3201,,5\ninvalid,4,6\n3202,3,7\n','sample.csv');
 assert.equal(curves.length,2);
 assert.deepEqual(curves[0].B,[3200,3201,3202]);
 assert.ok(Number.isNaN(curves[0].y[1]));
 assert.deepEqual(curves[1].y,[2,5,7]);
 assert.equal(curves[0].freq,null);
 assert.equal(curves[0].source,'sample.csv:Before');
});
test('incomplete CSV is rejected',()=>{assert.throws(()=>parseMergedCSV('B\n3200','x.csv'),/CSV requires/);});
