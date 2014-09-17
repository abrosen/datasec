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



def main():
    words  = open("words", 'r')
    corpus = list(open("cipher2", 'r').read())
    #print list(corpus)
    best_word = 'NO'
    best_plain = 'NO'
    best_phi  = 0
    i  = 0 
    for word in words:
        i +=1
        word = word.strip()
        print word
        word =  word[:8]
        trial = rc4crypt(corpus,word)
        """
        score  = phi2(getFreqs(trial))
        if score >= best_phi:
            best_phi = score
            best_word = word
            best_plain = trial
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
    print best_word, best_phi, best_plain 
    

if __name__ == '__main__':
    main()
