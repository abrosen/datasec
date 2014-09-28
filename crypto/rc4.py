from crypto_tools import phi, psi, phi2, getFreqs
import sys

#!/usr/bin/env python
#
#       RC4, ARC4, ARCFOUR algorithm
#
#       Copyright (c) 2009 joonis new media
#       Author: Thimo Kraemer <thimo.kraemer@joonis.de>
#
#       This program is free software; you can redistribute it and/or modify
#       it under the terms of the GNU General Public License as published by
#       the Free Software Foundation; either version 2 of the License, or
#       (at your option) any later version.
#       
#       This program is distributed in the hope that it will be useful,
#       but WITHOUT ANY WARRANTY; without even the implied warranty of
#       MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#       GNU General Public License for more details.
#       
#       You should have received a copy of the GNU General Public License
#       along with this program; if not, write to the Free Software
#       Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
#       MA 02110-1301, USA.
#


def rc4crypt(data, key):
    x = 0
    box = range(256)
    for i in range(256):
        x = (x + box[i] + ord(key[i % len(key)])) % 256
        box[i], box[x] = box[x], box[i]
    x = 0
    y = 0
    out = []
    for char in data:
        x = (x + 1) % 256
        y = (y + box[x]) % 256
        box[x], box[y] = box[y], box[x]
        out.append(chr(ord(char) ^ box[(box[x] + box[y]) % 256]))
    
    return ''.join(out)





class RC4(object):
    def __init__(self, seed):
        seed = list(seed)
        while len(seed)<8:
            seed.append("\x00")
        

        lseed = seed
        bytes = map(ord,lseed)
        
        K = [-1]*256
        for i in range(0,256,8):
            K[i  ] = bytes[0] 
            K[i+1] = bytes[1] 
            K[i+2] = bytes[2] 
            K[i+3] = bytes[3] 
            K[i+4] = bytes[4] 
            K[i+5] = bytes[5] 
            K[i+6] = bytes[6] 
            K[i+7] = bytes[7]
        
        self.S = range(0,256)
        
        j = 0
        
        for i in range(0,256):
            j =  (j + self.S[i] + K[i])%256
            x = self.S[i]
            self.S[i] = self.S[j]
            self.S[j] = x
        self.icount = 0
        self.jcount = 0

    def next(self):
        self.icount = (self.icount+1)%256;
        self.jcount = (self.jcount+self.S[self.icount])%256;
        
        x = self.S[self.icount];
        self.S[self.icount] = self.S[self.jcount];
        self.S[self.jcount] = x;

        t = (self.S[self.icount] + self.S[self.jcount])%256;
        return self.S[t];

    def decrypt(self,text):
        text = list(text)
        text = map(ord, text)
        output = ""
        for c in text:
            achar =  chr(c ^ self.next())
            output = output + achar
        return output



def main():
    words  = open("words", 'r')
    corpus = list(open("cipher2", 'r').read())
    #print list(corpus)
    best_word = 'NO'
    best_plain = 'NO'
    best_phi  = -50
   
    i  = 0 
    for word in words:

        i +=1
        word = word.strip()
        if i % 10000 ==0 :
            print i
        #print word
        while len(word) < 8:
            word =  word + '\x00'
        word =  word[:8]
        rc4 = RC4(word)
        output =  rc4.decrypt(corpus)

        score  = phi2(getFreqs(output))
        if score >= best_phi:
            best_phi = score
            best_word = word
            best_plain = output
            print best_word, best_phi

        """
        good =  True
        for char in trial:
            if ord(char)> 128:
                good = False 
                break
        if good:
            print word
            print trial
            break
            """
    print best_word, best_phi, best_plain 
    

if __name__ == '__main__':
    main()
