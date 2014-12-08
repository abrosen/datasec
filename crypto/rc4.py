from crypto_tools import phi, psi, phi2, getFreqs
import sys
from time import time


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
    t = time() 
    words  = open("words",'r')#open("mykeys", 'r')
    corpus = list(open("classcipher", 'r').read())
    #print list(corpus)
    best_word = 'GARBAGE'
    best_plain = 'GIBBERISH'
    best_phi  = -50
   
    i  = 0 
    for word in words:

        i +=1
        word = word.strip()
        if i % 10000 ==0 :
            print i, "trials.", time() - t
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
            if score > 0.025:
                break

    print time()- t, best_word, best_phi, best_plain
    

if __name__ == '__main__':
    main()
