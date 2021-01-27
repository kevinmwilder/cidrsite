(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cidr = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*
 * Any functions useful in making sense of IP addresses using CIDR notation.
 */

// future use class: var ipTools = require('bundle');
// future reference: https://stackoverflow.com/questions/950087/how-do-i-include-a-javascript-file-in-another-javascript-file
// future strict mode: https://stackoverflow.com/questions/1335851/what-does-use-strict-do-in-javascript-and-what-is-the-reasoning-behind-it
// future: https://www.reddit.com/r/javascript/comments/27viwb/browserify_how_to_create_a_module_that_can_be/


// Parse from CIDR format into .ipAddress + .prefixLength
function parseCIDR(cidr) {
   // let parts = parseCIDR("123.255.78.90/12");
   // yields:
   // parts.ipAddress = 123.255.78.90
   // parts.prefixLength = 12

   //OLD: let patt = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/;
   let patt = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
   let matches = patt.exec(cidr);

   if (matches == null) {
      throw "Invalid CIDR format provided.";
   }

   console.log("matches: " + matches.length + " from matches[0]: " + matches[0]);

   // OLD: let ipAddress = matches[1]; // BEFORE: whole IP, AFTER: 123 => 123.45.67.8
   let ipAddress = `${matches[1]}.${matches[2]}.${matches[3]}.${matches[4]}`;
   let prefixLength = matches[5];

   // If ipAddress has any unneccessary leading zeros
   // throw "Unexpected leading zero in IP address.";
   for (let i = 1; i <= 4; i++) {
      if (matches[i].length > 1) {
         if (matches[i].charAt(0) == "0") {
            throw "Unexpected leading zero in IP address.";
         }
      }
   }

   // If prefixLength has an unneccessary leading zero
   // throw "Unexpected leading zero in prefix.";
   if (matches[5].length > 1) {
      if (matches[5].charAt(0) == "0") {
         throw "Unexpected leading zero in prefix";
      }
   }

   // If ipAddress has any segments >255
   // throw "IP address values should be only 0..255.";
   for (let y = 1; y <= 4; y++) {
      // if ((matches[y] > 255) && (matches[y] < 0))
      // if ((matches[y] > 255) || (matches[y] < 0))
      if (matches[y] > 255 || matches[y] < 0) {
         throw "Invalid IP Address.";
      }
   }

   // If prefixLength is >32 (or <0)
   // throw "Prefix value should be only 0..32";
   if (matches[5] > 32 || matches[5] < 0) {
      throw "invalid CIDR bit length - /N value should be only 0..32";
   }

   return {
      ipAddress,
      prefixLength,
   };
}

// Parse from CIDR and expand into:
//    .lowIP - lowest IP address in CIDR range
//    .highIP - highest IP address in CIDR range
//    .maskBitCount - number of bits to keep starting at left-most
//    .mask - mask corresponding to .maskBitCount
function expandCIDR(cidr) {
   let parts = parseCIDR(cidr);

   let maskBitCount = parts.prefixLength; // e.g., 1.2.3.4/16 yields "16"
   let mask = getMaskFromBitCount(maskBitCount); // e.g., /16 yields "255.255.0.0"
   let ipRange = applyNetworkMaskToIP(parts.ipAddress, mask);

   return {
      lowIP: ipRange.lowIP,
      highIP: ipRange.highIP,
      maskBitCount,
      mask
   };
}

const masks = [
   "0.0.0.0",
   "128.0.0.0",
   "192.0.0.0",
   "224.0.0.0",
   "240.0.0.0",
   "248.0.0.0",
   "252.0.0.0",
   "254.0.0.0",
   "255.0.0.0",
   "255.128.0.0",
   "255.192.0.0",
   "255.224.0.0",
   "255.240.0.0",
   "255.248.0.0",
   "255.252.0.0",
   "255.254.0.0",
   "255.255.0.0",
   "255.255.128.0",
   "255.255.192.0",
   "255.255.224.0",
   "255.255.240.0",
   "255.255.248.0",
   "255.255.252.0",
   "255.255.254.0",
   "255.255.255.0",
   "255.255.255.128",
   "255.255.255.192",
   "255.255.255.224",
   "255.255.255.240",
   "255.255.255.248",
   "255.255.255.252",
   "255.255.255.254",
   "255.255.255.255",
];

function getMaskFromBitCount(maskBitCount) {
   if (masks.length != 33) throw "length of masks array should be 33";
   return masks[maskBitCount];
}

// - binarystr is a binary string with 1..8 0/1 characters
// - return same string padded with leading "0" chars up to 8 (byte length)
// does no error checking
function bytePad(binarystr) {
   var padChar = "0";
   var pad = new Array(1 + 8).join(padChar);
   return (pad + binarystr).slice(-pad.length);
}


function applyNetworkMaskToIP(ipAddr, mask) {
   // 12.34.56.78, 255.255.255.252 => 12.34.56.78
   let patt = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

   let matches = patt.exec(ipAddr);
   let ip1 = parseInt(matches[1]);
   let ip2 = parseInt(matches[2]);
   let ip3 = parseInt(matches[3]);
   let ip4 = parseInt(matches[4]);

   matches = patt.exec(mask);
   let mask1 = parseInt(matches[1]);
   let mask2 = parseInt(matches[2]);
   let mask3 = parseInt(matches[3]);
   let mask4 = parseInt(matches[4]);

   // low result octets
   let low1 = ip1 & mask1; // 11101011 & 11111000 = 11101000 low
   let low2 = ip2 & mask2; // 11101011 & 11111000 = 11101111 hi
   let low3 = ip3 & mask3;
   let low4 = ip4 & mask4;

   // high result octets
   // note: logical AND with 0b000... is to shrink
   // the 32-bit number value down to a single byte
   let high1 = 0b00000000000000000000000011111111 & (low1 | ~mask1);
   let high2 = 0b00000000000000000000000011111111 & (low2 | ~mask2);
   let high3 = 0b00000000000000000000000011111111 & (low3 | ~mask3);
   let high4 = 0b00000000000000000000000011111111 & (low4 | ~mask4);

   lowIP = `${low1}.${low2}.${low3}.${low4}`;
   highIP = `${high1}.${high2}.${high3}.${high4}`;

   return {
      lowIP, highIP
   };
}

function convertIpToBinary(ip) {
   let patt = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
   let matches = patt.exec(ip);

   let bin1 = binaryPad(parseInt(matches[1]).toString(2));
   let bin2 = binaryPad(parseInt(matches[2]).toString(2));
   let bin3 = binaryPad(parseInt(matches[3]).toString(2));
   let bin4 = binaryPad(parseInt(matches[4]).toString(2));
   return `${bin1}.${bin2}.${bin3}.${bin4}`;
}

/*
let ip = "121.36.95.13";
let binIP = convertIpToBinary(ip);
console.log(`${ip} => ${binIP}`);
*/

function convertBinaryCidrStringToDecimalCidrString(bincidr) {
   let start = 0;
   let end = 8;
   let octet1 = parseInt(bincidr.substring(start, end), 2);
   start += 9; end += 9;
   let octet2 = parseInt(bincidr.substring(start, end), 2);
   start += 9; end += 9;
   let octet3 = parseInt(bincidr.substring(start, end), 2);
   start += 9; end += 9;
   let octet4 = parseInt(bincidr.substring(start, end), 2);

   let deccidr = `${octet1}.${octet2}.${octet3}.${octet4}`;
   return deccidr;
}

function convertBinaryCidrStringToIpRange(bincidr, ip) {
   let patt = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
   let matches = patt.exec(ip);

   let start = 0;
   let end = 8;
   let cidr1 = parseInt(bincidr.substring(start, end), 2);
   let ip1 = parseInt(matches[1], 10) & cidr1;

   start += 9;
   end += 9;
   let cidr2 = parseInt(bincidr.substring(start, end), 2);
   let ip2 = parseInt(matches[2], 10) & cidr2;

   start += 9;
   end += 9;
   let cidr3 = parseInt(bincidr.substring(start, end), 2);
   let ip3 = parseInt(matches[3], 10) & cidr3;

   start += 9;
   end += 9;
   let cidr4 = parseInt(bincidr.substring(start, end), 2);
   let ip4 = parseInt(matches[4], 10) & cidr4;

   let minIp = `${ip1}.${ip2}.${ip3}.${ip4}`;
   return minIp;
}

function cidr() {
   //const pad = bytePad;
   //const parse = parseCIDR;

   return {
      bytePad,
      parseCIDR,
      expandCIDR
   };
}

// https://github.com/browserify/browserify-handbook
// this works // module.exports = bytePad;
//module.exports = bytePad;
module.exports = cidr;

//alert("hello from this");
/* usage:

cidr = "1.2.3.4/24";
ipRange = expandCIDR(cidr);
console.log(`${cidr} expands to ${ipRange.firstIP}-${ipRange.lastIP}`);

*/

},{}]},{},[1])(1)
});
